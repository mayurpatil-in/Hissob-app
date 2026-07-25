"""
AI Service — Smart Financial Insights Generator and Natural Language Receipt Parser.
"""
import re
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
from app.models.finance import Expense
from app.models.donor import Donor
from app.models.tenant import Tenant
from app.schemas.ai import AIInsight, AIInsightsResponse, ParsedReceiptOutput


class AIService:
    def __init__(self, db: Session):
        self.db = db

    def parse_natural_language_receipt(self, text: str) -> ParsedReceiptOutput:
        """Parses natural language prompt like 'Received 5000 cash from Ramesh Patel' into structured fields."""
        text_clean = text.strip()

        # Extract amount (e.g. 5000 or ₹5,000 or 5k)
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

        # Extract payment mode
        mode = "cash"
        if re.search(r'\b(upi|gpay|phonepe|paytm|online)\b', text_clean, re.IGNORECASE):
            mode = "upi"
        elif re.search(r'\b(cheque|check)\b', text_clean, re.IGNORECASE):
            mode = "cheque"
        elif re.search(r'\b(neft|rtgs|bank)\b', text_clean, re.IGNORECASE):
            mode = "neft"

        # Extract donor name
        donor_name = None
        name_match = re.search(r'(?:from|by)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)', text_clean)
        if name_match:
            donor_name = name_match.group(1)
        else:
            # Fallback regex for single or multi-words after 'from'
            from_match = re.search(r'(?:from|by)\s+([A-Za-z\s]+?)(?:\s+for|\s+via|\s+in|\s*$)', text_clean, re.IGNORECASE)
            if from_match:
                donor_name = from_match.group(1).strip()

        # Extract purpose
        purpose = None
        purpose_match = re.search(r'(?:for|towards)\s+([A-Za-z0-9\s]+?)(?:\s+from|\s+via|\s*$)', text_clean, re.IGNORECASE)
        if purpose_match:
            purpose = purpose_match.group(1).strip()

        return ParsedReceiptOutput(
            amount=amount,
            donor_name=donor_name,
            payment_mode=mode,
            purpose=purpose or "Festival Donation",
            confidence_score=0.96 if (amount and donor_name) else 0.75,
            parsed_fields={
                "raw_text": text,
                "detected_amount": amount,
                "detected_mode": mode,
                "detected_donor": donor_name,
            },
        )

    def generate_smart_insights(self, tenant_id: Optional[UUID]) -> AIInsightsResponse:
        """Generates AI-powered financial health insights and recommendations."""
        insights: List[AIInsight] = []
        tenant_name = "Hissob Platform"

        if tenant_id:
            tenant = self.db.get(Tenant, tenant_id)
            if tenant:
                tenant_name = tenant.name

            # Query collections & pending settlements
            unsettled_stmt = select(func.sum(Receipt.amount), func.count(Receipt.id)).where(
                Receipt.tenant_id == tenant_id,
                Receipt.status == ReceiptStatus.PENDING_SETTLEMENT,
            )
            unsettled_res = self.db.execute(unsettled_stmt).first()
            unsettled_sum = float(unsettled_res[0] or 0.0)
            unsettled_count = int(unsettled_res[1] or 0)

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

            # Query Total Collections vs Total Expenses
            tot_coll = float(self.db.execute(
                select(func.sum(Receipt.amount)).where(Receipt.tenant_id == tenant_id, Receipt.status != ReceiptStatus.CANCELLED)
            ).scalar() or 0.0)

            tot_exp = float(self.db.execute(
                select(func.sum(Expense.amount)).where(Expense.tenant_id == tenant_id, Expense.status == "paid")
            ).scalar() or 0.0)

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

            # VIP Donor retention insight
            vip_count = self.db.execute(select(func.count(Donor.id)).where(Donor.tenant_id == tenant_id, Donor.is_vip == True)).scalar() or 0
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
