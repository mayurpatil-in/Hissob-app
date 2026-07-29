"""
AI Service — Smart Financial Insights Generator, LLM Chatbot, Audit Engine, and Natural Language Receipt Parser.
"""
import re
import json
import logging
import httpx
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc
from collections import Counter

from app.core.config import settings
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
from app.models.finance import Expense
from app.models.donor import Donor
from app.models.tenant import Tenant
from app.models.festival import Festival
from app.schemas.ai import (
    AIInsight, AIInsightsResponse, ParsedReceiptOutput, AIChatResponse,
    AuditFinding, AIAuditResponse, AIReportResponse,
)

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self, db: Session):
        self.db = db

    def _call_gemini_api(self, prompt: str, system_instruction: str = "") -> Optional[str]:
        """
        Calls Google Gemini REST API (gemini-2.0-flash).
        Returns raw text response or None if API key is missing or call fails.
        """
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.info("GEMINI_API_KEY is not set.")
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL_NAME}:generateContent?key={api_key}"
        
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ]
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        try:
            with httpx.Client(timeout=12.0) as client:
                response = client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
                else:
                    logger.warning(f"Gemini API returned status {response.status_code}: {response.text[:200]}")
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")

        return None

    def _call_openai_api(self, prompt: str, system_instruction: str = "") -> Optional[str]:
        """
        Calls OpenAI REST API (gpt-4o-mini).
        Returns raw text response or None if API key is missing or call fails.
        """
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            logger.info("OPENAI_API_KEY is not set.")
            return None

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": settings.OPENAI_MODEL_NAME,
            "messages": messages,
            "temperature": 0.3,
        }

        try:
            with httpx.Client(timeout=12.0) as client:
                response = client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if choices:
                        return choices[0].get("message", {}).get("content", "")
                else:
                    logger.warning(f"OpenAI API returned status {response.status_code}: {response.text[:200]}")
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")

        return None

    def _call_llm(self, prompt: str, system_instruction: str = "", tenant_id: Optional[UUID] = None) -> Optional[str]:
        """
        Dispatches LLM calls to OpenAI or Gemini depending on the tenant's configured ai_provider setting.
        """
        provider = "gemini"
        if tenant_id:
            tenant = self.db.get(Tenant, tenant_id)
            if tenant and getattr(tenant, "ai_provider", None):
                provider = tenant.ai_provider.lower()

        if provider == "openai":
            res = self._call_openai_api(prompt, system_instruction)
            if res:
                return res
            # Fallback to Gemini if OpenAI call fails
            return self._call_gemini_api(prompt, system_instruction)
        else:
            res = self._call_gemini_api(prompt, system_instruction)
            if res:
                return res
            # Fallback to OpenAI if Gemini call fails
            return self._call_openai_api(prompt, system_instruction)

    def _build_tenant_financial_context(self, tenant_id: Optional[UUID]) -> Dict[str, Any]:
        """
        Aggregates real-time financial stats and summary data for the LLM prompt context.
        """
        tenant_name = "Hisob ERP Platform"
        if tenant_id:
            tenant = self.db.get(Tenant, tenant_id)
            if tenant:
                tenant_name = tenant.name

        tenant_filter = (Receipt.tenant_id == tenant_id) if tenant_id else (Receipt.id.isnot(None))
        expense_tenant_filter = (Expense.tenant_id == tenant_id) if tenant_id else (Expense.id.isnot(None))
        donor_tenant_filter = (Donor.tenant_id == tenant_id) if tenant_id else (Donor.id.isnot(None))
        fest_tenant_filter = (Festival.tenant_id == tenant_id) if tenant_id else (Festival.id.isnot(None))

        # 1. Total Collections & Receipt Stats
        tot_coll = float(self.db.execute(
            select(func.coalesce(func.sum(Receipt.amount), 0.0)).where(
                tenant_filter, Receipt.status != ReceiptStatus.CANCELLED
            )
        ).scalar() or 0.0)

        tot_receipts = self.db.execute(
            select(func.count(Receipt.id)).where(
                tenant_filter, Receipt.status != ReceiptStatus.CANCELLED
            )
        ).scalar() or 0

        # Cash vs UPI/Digital split
        cash_coll = float(self.db.execute(
            select(func.coalesce(func.sum(Receipt.amount), 0.0)).where(
                tenant_filter,
                Receipt.status != ReceiptStatus.CANCELLED,
                Receipt.payment_mode == PaymentMode.CASH
            )
        ).scalar() or 0.0)

        upi_coll = float(self.db.execute(
            select(func.coalesce(func.sum(Receipt.amount), 0.0)).where(
                tenant_filter,
                Receipt.status != ReceiptStatus.CANCELLED,
                Receipt.payment_mode == PaymentMode.UPI
            )
        ).scalar() or 0.0)

        other_coll = max(0.0, tot_coll - cash_coll - upi_coll)

        # Pending Cash Settlements
        unsettled_res = self.db.execute(
            select(
                func.coalesce(func.sum(Receipt.amount), 0.0),
                func.count(Receipt.id)
            ).where(
                tenant_filter,
                Receipt.status == ReceiptStatus.PENDING_SETTLEMENT
            )
        ).first()
        unsettled_sum = float(unsettled_res[0] if unsettled_res else 0.0)
        unsettled_count = int(unsettled_res[1] if unsettled_res else 0)

        # 2. Total Expenses
        tot_exp = float(self.db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0.0)).where(
                expense_tenant_filter, Expense.status == "paid"
            )
        ).scalar() or 0.0)

        pending_exp = float(self.db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0.0)).where(
                expense_tenant_filter, Expense.status == "pending"
            )
        ).scalar() or 0.0)

        # 3. Donors Summary
        tot_donors = self.db.execute(
            select(func.count(Donor.id)).where(donor_tenant_filter)
        ).scalar() or 0

        vip_donors = self.db.execute(
            select(func.count(Donor.id)).where(donor_tenant_filter, Donor.is_vip == True)
        ).scalar() or 0

        top_donors_raw = self.db.scalars(
            select(Donor)
            .where(donor_tenant_filter)
            .order_by(desc(Donor.total_donations))
            .limit(5)
        ).all()
        top_donors = [{"name": d.full_name, "total": float(d.total_donations or 0.0), "is_vip": d.is_vip} for d in top_donors_raw]

        # 4. Festivals Breakdown
        festivals_raw = self.db.scalars(
            select(Festival).where(fest_tenant_filter)
        ).all()

        festivals = []
        for f in festivals_raw:
            f_coll = float(self.db.execute(
                select(func.coalesce(func.sum(Receipt.amount), 0.0)).where(
                    Receipt.festival_id == f.id,
                    Receipt.status != ReceiptStatus.CANCELLED
                )
            ).scalar() or 0.0)
            f_exp = float(self.db.execute(
                select(func.coalesce(func.sum(Expense.amount), 0.0)).where(
                    Expense.festival_id == f.id,
                    Expense.status == "paid"
                )
            ).scalar() or 0.0)

            festivals.append({
                "name": f.name,
                "deity": f.deity or "N/A",
                "status": f.status,
                "budget": float(f.budget or 0.0),
                "collected": f_coll,
                "expenses": f_exp,
            })

        return {
            "tenant_name": tenant_name,
            "total_collections": tot_coll,
            "total_receipts_count": tot_receipts,
            "cash_collections": cash_coll,
            "upi_collections": upi_coll,
            "other_collections": other_coll,
            "unsettled_cash_amount": unsettled_sum,
            "unsettled_cash_count": unsettled_count,
            "total_expenses_paid": tot_exp,
            "pending_expenses": pending_exp,
            "net_surplus": tot_coll - tot_exp,
            "total_donors": tot_donors,
            "vip_donors_count": vip_donors,
            "top_donors": top_donors,
            "festivals": festivals,
        }

    def chat_with_ai(self, question: str, tenant_id: Optional[UUID]) -> AIChatResponse:
        """
        Context-aware financial Q&A chatbot using Gemini LLM.
        """
        ctx = self._build_tenant_financial_context(tenant_id)
        context_str = json.dumps(ctx, indent=2)

        system_instruction = (
            f"You are Hisob AI, an intelligent financial audit and analytics assistant for '{ctx.get('tenant_name')}'. "
            "You have access to real-time database totals. Answer user questions accurately based ONLY on this data context. "
            "Format currency as INR (₹ X,XX,XXX). Keep answers clear, polite, and well-structured using bullet points where appropriate."
        )

        prompt = f"ORGANIZATION FINANCIAL DATA CONTEXT:\n{context_str}\n\nUSER QUESTION:\n{question}"

        llm_response = self._call_llm(prompt, system_instruction, tenant_id)
        is_llm = bool(llm_response)

        if not llm_response:
            # Smart context-aware fallback answer
            q_lower = question.lower()
            if "collect" in q_lower or "total" in q_lower or "received" in q_lower:
                llm_response = (
                    f"📊 **Financial Collection Summary for {ctx.get('tenant_name')}**:\n\n"
                    f"* **Total Collections:** ₹ {ctx['total_collections']:,.2f} ({ctx['total_receipts_count']} total receipts)\n"
                    f"* **Cash Collected:** ₹ {ctx['cash_collections']:,.2f}\n"
                    f"* **UPI / Online Collections:** ₹ {ctx['upi_collections']:,.2f}\n"
                    f"* **Pending Unsettled Cash:** ₹ {ctx['unsettled_cash_amount']:,.2f} ({ctx['unsettled_cash_count']} receipts)"
                )
            elif "expense" in q_lower or "spend" in q_lower or "out" in q_lower:
                llm_response = (
                    f"💸 **Expense Summary for {ctx.get('tenant_name')}**:\n\n"
                    f"* **Paid Expenses:** ₹ {ctx['total_expenses_paid']:,.2f}\n"
                    f"* **Pending Approvals:** ₹ {ctx['pending_expenses']:,.2f}\n"
                    f"* **Net Reserve / Surplus:** ₹ {ctx['net_surplus']:,.2f}"
                )
            elif "donor" in q_lower or "vip" in q_lower or "top" in q_lower:
                top_str = "\n".join([f"  - **{d['name']}**: ₹ {d['total']:,.2f}" + (" (VIP 🌟)" if d['is_vip'] else "") for d in ctx.get('top_donors', [])])
                llm_response = (
                    f"👥 **Donor Intelligence Summary**:\n\n"
                    f"* **Total Donors:** {ctx['total_donors']}\n"
                    f"* **VIP Donors:** {ctx['vip_donors_count']}\n"
                    f"* **Top Contributors:**\n{top_str or '  - No transactions recorded yet.'}"
                )
            elif "ganesh" in q_lower or "durga" in q_lower or "festival" in q_lower:
                fest_str = "\n".join([f"  - **{f['name']}**: Target ₹ {f['budget']:,.2f} | Collected ₹ {f['collected']:,.2f} | Expenses ₹ {f['expenses']:,.2f}" for f in ctx.get('festivals', [])])
                llm_response = (
                    f"🎪 **Festival Financial Breakdown**:\n\n"
                    f"{fest_str or 'No active festivals configured yet.'}"
                )
            else:
                llm_response = (
                    f"Hello! I am **Hisob AI Financial Assistant**.\n\n"
                    f"Here is a quick snapshot of **{ctx.get('tenant_name')}**:\n"
                    f"* **Total Collections:** ₹ {ctx['total_collections']:,.2f}\n"
                    f"* **Paid Expenses:** ₹ {ctx['total_expenses_paid']:,.2f}\n"
                    f"* **Net Surplus Balance:** ₹ {ctx['net_surplus']:,.2f}\n\n"
                    f"Feel free to ask me details about donors, cash settlements, or festival campaign collections!"
                )

        followups = [
            "How much did we collect for Ganesh Chaturthi?",
            "Who are our top VIP donors?",
            "What is our total cash vs UPI collection split?",
            "How much cash is currently pending settlement?"
        ]

        provider_name = "Gemini 2.0 Flash"
        if tenant_id:
            tenant = self.db.get(Tenant, tenant_id)
            if tenant and getattr(tenant, "ai_provider", None) == "openai":
                provider_name = "GPT-4o-Mini"

        return AIChatResponse(
            question=question,
            answer=llm_response,
            suggested_followups=followups,
            generated_at=datetime.now(timezone.utc).isoformat(),
            is_llm_powered=is_llm,
            ai_provider=provider_name,
        )


    def parse_natural_language_receipt(self, text: str) -> ParsedReceiptOutput:
        """Parses natural language prompt into structured fields using LLM with regex fallback."""
        text_clean = text.strip()

        # Try Gemini LLM for high accuracy parsing
        prompt = (
            f"Extract receipt fields from this dictation: '{text_clean}'\n"
            "Return JSON only with keys:\n"
            "- 'amount': float or null\n"
            "- 'donor_name': string or null\n"
            "- 'payment_mode': one of ['cash', 'upi', 'cheque', 'neft']\n"
            "- 'purpose': string or null\n"
            "Respond ONLY with valid JSON."
        )
        llm_raw = self._call_llm(prompt)
        if llm_raw:
            try:
                clean_json = re.sub(r'```(?:json)?\s*|\s*```', '', llm_raw).strip()
                parsed = json.loads(clean_json)
                amount = float(parsed.get("amount")) if parsed.get("amount") is not None else None
                donor_name = parsed.get("donor_name")
                mode = str(parsed.get("payment_mode", "cash")).lower()
                purpose = parsed.get("purpose") or "Festival Donation"
                
                return ParsedReceiptOutput(
                    amount=amount,
                    donor_name=donor_name,
                    payment_mode=mode,
                    purpose=purpose,
                    confidence_score=0.98 if (amount and donor_name) else 0.85,
                    parsed_fields={
                        "raw_text": text,
                        "detected_amount": amount,
                        "detected_mode": mode,
                        "detected_donor": donor_name,
                        "llm_powered": True,
                    },
                )
            except Exception as e:
                logger.warning(f"Failed to parse LLM JSON response: {e}")

        # Deterministic Regex Fallback
        amount = None
        amount_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k)?', text_clean, re.IGNORECASE)
        if amount_match:
            try:
                raw_amt = amount_match.group(1).replace(",", "")
                amount = float(raw_amt)
                if "k" in text_clean.lower() and amount < 1000:
                    amount *= 1000
            except ValueError:
                pass

        mode = "cash"
        if re.search(r'\b(upi|gpay|phonepe|paytm|online)\b', text_clean, re.IGNORECASE):
            mode = "upi"
        elif re.search(r'\b(cheque|check)\b', text_clean, re.IGNORECASE):
            mode = "cheque"
        elif re.search(r'\b(neft|rtgs|bank)\b', text_clean, re.IGNORECASE):
            mode = "neft"

        donor_name = None
        name_match = re.search(r'(?:from|by)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)', text_clean)
        if name_match:
            donor_name = name_match.group(1)
        else:
            from_match = re.search(r'(?:from|by)\s+([A-Za-z\s]+?)(?:\s+for|\s+via|\s+in|\s*$)', text_clean, re.IGNORECASE)
            if from_match:
                donor_name = from_match.group(1).strip()

        purpose = None
        purpose_match = re.search(r'(?:for|towards)\s+([A-Za-z0-9\s]+?)(?:\s+from|\s+via|\s*$)', text_clean, re.IGNORECASE)
        if purpose_match:
            purpose = purpose_match.group(1).strip()

        return ParsedReceiptOutput(
            amount=amount,
            donor_name=donor_name,
            payment_mode=mode,
            purpose=purpose or "Festival Donation",
            confidence_score=0.94 if (amount and donor_name) else 0.75,
            parsed_fields={
                "raw_text": text,
                "detected_amount": amount,
                "detected_mode": mode,
                "detected_donor": donor_name,
                "llm_powered": False,
            },
        )

    def generate_smart_insights(self, tenant_id: Optional[UUID]) -> AIInsightsResponse:
        """Generates AI-powered financial health insights and recommendations."""
        insights: List[AIInsight] = []
        ctx = self._build_tenant_financial_context(tenant_id)
        tenant_name = ctx.get("tenant_name", "Hisob Platform")

        if tenant_id:
            unsettled_sum = ctx.get("unsettled_cash_amount", 0.0)
            unsettled_count = ctx.get("unsettled_cash_count", 0)

            if unsettled_count > 0:
                insights.append(
                    AIInsight(
                        category="settlement",
                        title=f"₹ {unsettled_sum:,.2f} Pending Cash Settlement",
                        description=f"There are {unsettled_count} cash receipts collected that have not yet been verified by the Treasurer.",
                        action_suggestion="Collectors should submit cash settlements to the Treasurer before EOD to maintain clear audit compliance.",
                        impact_level="high" if unsettled_sum > 10000 else "medium",
                    )
                )

            tot_coll = ctx.get("total_collections", 0.0)
            tot_exp = ctx.get("total_expenses_paid", 0.0)

            if tot_coll > 0:
                expense_ratio = (tot_exp / tot_coll) * 100
                if expense_ratio < 40:
                    insights.append(
                        AIInsight(
                            category="budget",
                            title="Strong Liquidity & Low Expense Ratio",
                            description=f"Expenses are currently only {expense_ratio:.1f}% of total collections.",
                            action_suggestion="Sufficient reserves available to fund upcoming festival event activities.",
                            impact_level="info",
                        )
                    )
                elif expense_ratio > 80:
                    insights.append(
                        AIInsight(
                            category="budget",
                            title="High Expense Ratio Alert",
                            description=f"Paid expenses have reached {expense_ratio:.1f}% of total collections.",
                            action_suggestion="Review pending expense approvals before approving new vendor payouts.",
                            impact_level="high",
                        )
                    )

            vip_count = ctx.get("vip_donors_count", 0)
            if vip_count > 0:
                insights.append(
                    AIInsight(
                        category="donor",
                        title=f"{vip_count} VIP Donors Registered",
                        description="VIP Donors contribute significantly to festival funding goals.",
                        action_suggestion="Consider sending automated WhatsApp / Email thank-you vouchers to VIP donors.",
                        impact_level="medium",
                    )
                )

            # ── Enhanced: Duplicate UPI Reference Detection ──
            upi_refs = self.db.query(Receipt.upi_reference, func.count(Receipt.id)).filter(
                Receipt.tenant_id == tenant_id,
                Receipt.upi_reference.isnot(None),
                Receipt.upi_reference != "",
                Receipt.status != "cancelled"
            ).group_by(Receipt.upi_reference).having(func.count(Receipt.id) > 1).all()
            if upi_refs:
                dup_count = sum(c for _, c in upi_refs)
                insights.append(
                    AIInsight(
                        category="audit",
                        title=f"{len(upi_refs)} Duplicate UPI Reference(s) Detected",
                        description=f"{dup_count} receipts share duplicate UPI transaction references. This may indicate double-recording.",
                        action_suggestion="Review flagged UPI receipts and cancel duplicate entries immediately.",
                        impact_level="high",
                    )
                )

            # ── Enhanced: Stale Unsettled Cash (>7 days) ──
            stale_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
            stale_count = self.db.query(func.count(Receipt.id)).filter(
                Receipt.tenant_id == tenant_id,
                Receipt.payment_mode == "cash",
                Receipt.status.in_(["issued", "pending_settlement"]),
                Receipt.created_at < stale_cutoff
            ).scalar() or 0
            if stale_count > 0:
                insights.append(
                    AIInsight(
                        category="settlement",
                        title=f"{stale_count} Cash Receipt(s) Pending > 7 Days",
                        description="Cash receipts unsettled for more than a week pose audit compliance risk.",
                        action_suggestion="Prioritize settlement of stale cash receipts with the Treasurer urgently.",
                        impact_level="high",
                    )
                )

            # ── Enhanced: Festival Over-Budget Alert ──
            for fest in ctx.get("festivals", []):
                if fest.get("budget", 0) > 0 and fest.get("expenses", 0) > fest["budget"]:
                    over_pct = ((fest["expenses"] - fest["budget"]) / fest["budget"]) * 100
                    insights.append(
                        AIInsight(
                            category="budget",
                            title=f"{fest['name']} Exceeds Budget by {over_pct:.0f}%",
                            description=f"Expenses ₹ {fest['expenses']:,.2f} have exceeded the target budget of ₹ {fest['budget']:,.2f}.",
                            action_suggestion="Freeze new expense approvals for this festival and review vendor payouts.",
                            impact_level="high" if over_pct > 20 else "medium",
                        )
                    )

        if not insights:
            insights.append(
                AIInsight(
                    category="collection",
                    title="Healthy System Status",
                    description="All collection records and financial ledgers are up to date.",
                    action_suggestion="Continue recording daily receipts and settlements on time.",
                    impact_level="info",
                )
            )

        return AIInsightsResponse(
            generated_at=datetime.now(timezone.utc).isoformat(),
            tenant_name=tenant_name,
            insights=insights,
        )

    # ════════════════════════════════════════════════════════════════
    #  AI FINANCIAL AUDIT SCAN
    # ════════════════════════════════════════════════════════════════

    def run_financial_audit(self, tenant_id: Optional[UUID]) -> AIAuditResponse:
        """Runs a comprehensive AI-driven financial audit scan with 8 detection rules."""
        findings: List[AuditFinding] = []
        tenant_name = "Hisob Platform"
        if tenant_id:
            tenant = self.db.get(Tenant, tenant_id)
            if tenant:
                tenant_name = tenant.name

        if not tenant_id:
            return AIAuditResponse(
                generated_at=datetime.now(timezone.utc).isoformat(),
                tenant_name=tenant_name,
                findings=[],
            )

        t_filter = Receipt.tenant_id == tenant_id

        # ── 1. Duplicate UPI References ──
        upi_dups = self.db.query(
            Receipt.upi_reference, func.count(Receipt.id).label("cnt")
        ).filter(
            t_filter,
            Receipt.upi_reference.isnot(None),
            Receipt.upi_reference != "",
            Receipt.status != "cancelled"
        ).group_by(Receipt.upi_reference).having(func.count(Receipt.id) > 1).all()

        for ref, cnt in upi_dups:
            dup_receipts = self.db.query(Receipt.receipt_number).filter(
                t_filter, Receipt.upi_reference == ref, Receipt.status != "cancelled"
            ).all()
            findings.append(AuditFinding(
                category="duplicate_upi",
                severity="high",
                title=f"Duplicate UPI Reference: {ref}",
                description=f"{cnt} receipts share the same UPI transaction reference '{ref}'. This indicates potential double-recording.",
                suggestion="Review these receipts and cancel the duplicate entry.",
                affected_records=[r[0] for r in dup_receipts],
            ))

        # ── 2. Unusually Large Receipts (> 3× average) ──
        avg_amt = self.db.query(func.avg(Receipt.amount)).filter(
            t_filter, Receipt.status != "cancelled"
        ).scalar() or 0.0
        if avg_amt > 0:
            threshold = float(avg_amt) * 3
            large_receipts = self.db.query(Receipt).filter(
                t_filter, Receipt.status != "cancelled", Receipt.amount > threshold
            ).order_by(desc(Receipt.amount)).limit(10).all()
            for r in large_receipts:
                findings.append(AuditFinding(
                    category="large_receipt",
                    severity="medium",
                    title=f"Unusually Large Receipt: ₹ {float(r.amount):,.2f}",
                    description=f"Receipt {r.receipt_number} is {float(r.amount)/float(avg_amt):.1f}× the average donation of ₹ {float(avg_amt):,.2f}.",
                    suggestion="Verify this receipt with the donor and collector for authenticity.",
                    affected_records=[r.receipt_number],
                ))

        # ── 3. Stale Unsettled Cash (> 7 days) ──
        stale_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        stale_receipts = self.db.query(Receipt).filter(
            t_filter,
            Receipt.payment_mode == "cash",
            Receipt.status.in_(["issued", "pending_settlement"]),
            Receipt.created_at < stale_cutoff
        ).order_by(Receipt.created_at).limit(20).all()
        if stale_receipts:
            findings.append(AuditFinding(
                category="stale_cash",
                severity="high",
                title=f"{len(stale_receipts)} Cash Receipt(s) Unsettled > 7 Days",
                description="These cash receipts have been pending settlement for over a week, posing audit compliance risk.",
                suggestion="Collectors must submit these receipts to the Treasurer immediately.",
                affected_records=[r.receipt_number for r in stale_receipts],
            ))

        # ── 4. Festival Over-Budget ──
        festivals = self.db.query(Festival).filter(Festival.tenant_id == tenant_id).all()
        for f in festivals:
            budget = float(f.budget or 0.0)
            if budget <= 0:
                continue
            f_exp = float(self.db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
                Expense.tenant_id == tenant_id,
                Expense.festival_id == f.id,
                Expense.status == "paid"
            ).scalar() or 0.0)
            if f_exp > budget:
                over_pct = ((f_exp - budget) / budget) * 100
                findings.append(AuditFinding(
                    category="over_budget",
                    severity="high" if over_pct > 20 else "medium",
                    title=f"{f.name}: Budget Exceeded by {over_pct:.0f}%",
                    description=f"Expenses ₹ {f_exp:,.2f} exceed the target budget of ₹ {budget:,.2f} for {f.name}.",
                    suggestion="Freeze new expense approvals for this festival and review vendor payouts.",
                    affected_records=[f.name],
                ))

        # ── 5. Vendor Concentration Risk ──
        exp_filter = Expense.tenant_id == tenant_id
        total_exp_paid = float(self.db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
            exp_filter, Expense.status == "paid"
        ).scalar() or 0.0)
        if total_exp_paid > 0:
            vendor_totals = self.db.query(
                Expense.vendor_name, func.sum(Expense.amount).label("total")
            ).filter(
                exp_filter, Expense.status == "paid",
                Expense.vendor_name.isnot(None), Expense.vendor_name != ""
            ).group_by(Expense.vendor_name).order_by(desc("total")).all()
            for vendor, vtotal in vendor_totals:
                pct = (float(vtotal) / total_exp_paid) * 100
                if pct > 40:
                    findings.append(AuditFinding(
                        category="vendor_concentration",
                        severity="medium",
                        title=f"Vendor Concentration: {vendor} ({pct:.0f}%)",
                        description=f"Vendor '{vendor}' has received ₹ {float(vtotal):,.2f} — {pct:.0f}% of total paid expenses.",
                        suggestion="Diversify vendor spend or obtain competitive quotes to ensure fair pricing.",
                        affected_records=[vendor],
                    ))

        # ── 6. Inactive VIP Donors (no donations in 90 days) ──
        ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
        vip_donors = self.db.query(Donor).filter(
            Donor.tenant_id == tenant_id, Donor.is_vip == True
        ).all()
        for d in vip_donors:
            recent = self.db.query(func.count(Receipt.id)).filter(
                Receipt.tenant_id == tenant_id,
                Receipt.donor_id == d.id,
                Receipt.status != "cancelled",
                Receipt.created_at >= ninety_days_ago
            ).scalar() or 0
            if recent == 0:
                findings.append(AuditFinding(
                    category="inactive_vip",
                    severity="info",
                    title=f"Inactive VIP Donor: {d.full_name}",
                    description=f"VIP donor '{d.full_name}' has no donations in the last 90 days.",
                    suggestion="Send a personalized WhatsApp or email outreach to re-engage this VIP donor.",
                    affected_records=[d.full_name],
                ))

        # ── 7. Missing Bill/Voucher on Paid Expenses ──
        missing_bill = self.db.query(Expense).filter(
            exp_filter, Expense.status == "paid",
            (Expense.bill_url.is_(None)) | (Expense.bill_url == "")
        ).limit(15).all()
        if missing_bill:
            findings.append(AuditFinding(
                category="missing_bill",
                severity="medium",
                title=f"{len(missing_bill)} Paid Expense(s) Without Bill Attachment",
                description="These paid expenses do not have a bill or voucher attached, which is required for audit compliance.",
                suggestion="Upload scanned bills or photos for these expenses to complete the audit trail.",
                affected_records=[e.expense_number for e in missing_bill],
            ))

        # ── 8. Round-Amount Pattern Detection ──
        round_receipts = self.db.query(Receipt).filter(
            t_filter, Receipt.status != "cancelled",
            Receipt.amount >= 1000,
            func.mod(Receipt.amount, 1000) == 0
        ).order_by(desc(Receipt.created_at)).limit(50).all()
        if len(round_receipts) >= 5:
            total_round = len(round_receipts)
            total_all = self.db.query(func.count(Receipt.id)).filter(
                t_filter, Receipt.status != "cancelled"
            ).scalar() or 1
            round_pct = (total_round / total_all) * 100
            if round_pct > 50:
                findings.append(AuditFinding(
                    category="round_amount",
                    severity="info",
                    title=f"{round_pct:.0f}% of Receipts are Exact Round Amounts",
                    description=f"{total_round} out of {total_all} receipts are exact multiples of ₹1,000. This pattern may warrant review.",
                    suggestion="Spot-check a sample of round-amount receipts to verify donor confirmation.",
                    affected_records=[r.receipt_number for r in round_receipts[:5]],
                ))

        # ── Compute health score ──
        high_count = sum(1 for f in findings if f.severity == "high")
        medium_count = sum(1 for f in findings if f.severity == "medium")
        info_count = sum(1 for f in findings if f.severity == "info")
        score = max(0, 100 - (high_count * 15) - (medium_count * 5) - (info_count * 1))

        return AIAuditResponse(
            generated_at=datetime.now(timezone.utc).isoformat(),
            tenant_name=tenant_name,
            total_findings=len(findings),
            high_count=high_count,
            medium_count=medium_count,
            info_count=info_count,
            health_score=score,
            findings=findings,
        )

    # ════════════════════════════════════════════════════════════════
    #  AI EXECUTIVE SUMMARY REPORT
    # ════════════════════════════════════════════════════════════════

    def generate_executive_report(self, tenant_id: Optional[UUID]) -> AIReportResponse:
        """Generates an LLM-powered executive financial summary report."""
        ctx = self._build_tenant_financial_context(tenant_id)
        audit = self.run_financial_audit(tenant_id)
        tenant_name = ctx.get("tenant_name", "Hisob Platform")

        # Build comprehensive data for LLM
        report_data = {
            "organization": tenant_name,
            "financial_summary": {
                "total_collections": ctx.get("total_collections", 0),
                "total_receipts": ctx.get("total_receipts_count", 0),
                "cash_collections": ctx.get("cash_collections", 0),
                "upi_collections": ctx.get("upi_collections", 0),
                "total_expenses_paid": ctx.get("total_expenses_paid", 0),
                "pending_expenses": ctx.get("pending_expenses", 0),
                "net_surplus": ctx.get("net_surplus", 0),
                "unsettled_cash": ctx.get("unsettled_cash_amount", 0),
                "unsettled_count": ctx.get("unsettled_cash_count", 0),
            },
            "donor_summary": {
                "total_donors": ctx.get("total_donors", 0),
                "vip_donors": ctx.get("vip_donors_count", 0),
                "top_donors": ctx.get("top_donors", []),
            },
            "festivals": ctx.get("festivals", []),
            "audit_health_score": audit.health_score,
            "audit_findings_count": audit.total_findings,
            "high_severity_findings": audit.high_count,
            "audit_findings_summary": [
                {"title": f.title, "severity": f.severity, "category": f.category}
                for f in audit.findings[:10]
            ],
        }

        system_instruction = (
            f"You are Hisob AI, an expert financial auditor for non-profit organization '{tenant_name}'. "
            "Generate a professional executive financial summary report. "
            "Use these sections with markdown headers: "
            "## Financial Overview, ## Settlement Compliance, ## Top Donors & VIP Engagement, "
            "## Festival Campaign Performance, ## Risk & Anomaly Summary, ## Recommendations. "
            "Format currency as ₹ X,XX,XXX. Use bullet points. Be concise and data-driven. "
            "End with 3 actionable recommendations."
        )

        prompt = f"ORGANIZATION DATA:\n{json.dumps(report_data, indent=2)}\n\nGenerate the executive financial summary report."

        llm_response = self._call_llm(prompt, system_instruction, tenant_id)
        is_llm = bool(llm_response)

        # Determine active provider name
        provider_name = "Gemini 2.0 Flash"
        if tenant_id:
            tenant = self.db.get(Tenant, tenant_id)
            if tenant and getattr(tenant, "ai_provider", None) == "openai":
                provider_name = "GPT-4o-Mini"

        if not llm_response:
            # Deterministic fallback report
            tc = ctx.get("total_collections", 0)
            te = ctx.get("total_expenses_paid", 0)
            ns = ctx.get("net_surplus", 0)
            td = ctx.get("total_donors", 0)
            vip = ctx.get("vip_donors_count", 0)
            uc = ctx.get("unsettled_cash_amount", 0)
            ucn = ctx.get("unsettled_cash_count", 0)

            fest_lines = ""
            for f in ctx.get("festivals", []):
                fest_lines += f"- **{f['name']}**: Collected ₹ {f['collected']:,.2f} / Budget ₹ {f['budget']:,.2f} | Expenses ₹ {f['expenses']:,.2f}\n"

            top_lines = ""
            for d in ctx.get("top_donors", []):
                vip_tag = " (VIP 🌟)" if d.get("is_vip") else ""
                top_lines += f"- **{d['name']}**: ₹ {d['total']:,.2f}{vip_tag}\n"

            findings_lines = ""
            for f in audit.findings[:5]:
                sev_icon = "🔴" if f.severity == "high" else ("🟡" if f.severity == "medium" else "🟢")
                findings_lines += f"- {sev_icon} **{f.title}** — {f.description}\n"

            llm_response = (
                f"# Executive Financial Summary — {tenant_name}\n\n"
                f"**Report Generated:** {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}\n\n"
                f"---\n\n"
                f"## Financial Overview\n\n"
                f"- **Total Collections:** ₹ {tc:,.2f} ({ctx.get('total_receipts_count', 0)} receipts)\n"
                f"- **Cash Collections:** ₹ {ctx.get('cash_collections', 0):,.2f}\n"
                f"- **UPI / Digital Collections:** ₹ {ctx.get('upi_collections', 0):,.2f}\n"
                f"- **Total Paid Expenses:** ₹ {te:,.2f}\n"
                f"- **Pending Expenses:** ₹ {ctx.get('pending_expenses', 0):,.2f}\n"
                f"- **Net Surplus:** ₹ {ns:,.2f}\n\n"
                f"## Settlement Compliance\n\n"
                f"- **Unsettled Cash:** ₹ {uc:,.2f} ({ucn} receipts pending)\n"
                f"- **Status:** {'⚠️ Action Required — submit settlements to Treasurer' if ucn > 0 else '✅ All cash receipts settled'}\n\n"
                f"## Top Donors & VIP Engagement\n\n"
                f"- **Total Donors:** {td} | **VIP Donors:** {vip}\n"
                f"{top_lines or '- No donor data available'}\n\n"
                f"## Festival Campaign Performance\n\n"
                f"{fest_lines or '- No active festivals configured'}\n\n"
                f"## Risk & Anomaly Summary\n\n"
                f"- **AI Audit Health Score:** {audit.health_score}/100\n"
                f"- **Findings:** {audit.total_findings} total ({audit.high_count} high, {audit.medium_count} medium, {audit.info_count} info)\n"
                f"{findings_lines or '- ✅ No anomalies detected'}\n\n"
                f"## Recommendations\n\n"
                f"1. {'Prioritize settlement of stale cash receipts with the Treasurer.' if ucn > 0 else 'Continue maintaining strong settlement compliance.'}\n"
                f"2. {'Review high-severity audit findings and resolve them promptly.' if audit.high_count > 0 else 'Maintain current audit compliance standards.'}\n"
                f"3. Send personalized thank-you messages to VIP donors to maintain donor engagement.\n"
            )

        return AIReportResponse(
            generated_at=datetime.now(timezone.utc).isoformat(),
            tenant_name=tenant_name,
            report_text=llm_response,
            ai_provider=provider_name,
            is_llm_powered=is_llm,
        )


