"""
Reports Generator Service — Calculates financial statements & ledger summaries.
"""
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
from app.models.finance import Expense, CashSettlement, SettlementStatus
from app.models.financial_year import FinancialYear
from app.schemas.reports import (
    DailyCollectionSummary,
    CashBookEntry,
    FinancialReportSummary,
)


class ReportsService:
    def __init__(self, db: Session):
        self.db = db

    def get_daily_collection_report(
        self, tenant_id: UUID, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> List[DailyCollectionSummary]:
        stmt = (
            select(
                Receipt.receipt_date,
                func.sum(Receipt.amount).label("total"),
                func.count(Receipt.id).label("count"),
                func.sum(func.coalesce(Receipt.amount, 0)).filter(Receipt.payment_mode == PaymentMode.CASH).label("cash"),
                func.sum(func.coalesce(Receipt.amount, 0)).filter(Receipt.payment_mode == PaymentMode.UPI).label("upi"),
                func.sum(func.coalesce(Receipt.amount, 0)).filter(Receipt.payment_mode == PaymentMode.CHEQUE).label("cheque"),
            )
            .where(
                Receipt.tenant_id == tenant_id,
                Receipt.status != ReceiptStatus.CANCELLED,
            )
            .group_by(Receipt.receipt_date)
            .order_by(Receipt.receipt_date.desc())
        )

        if start_date:
            stmt = stmt.where(Receipt.receipt_date >= start_date)
        if end_date:
            stmt = stmt.where(Receipt.receipt_date <= end_date)

        rows = self.db.execute(stmt).all()
        results = []
        for r in rows:
            total = float(r.total or 0)
            cash = float(r.cash or 0)
            upi = float(r.upi or 0)
            cheque = float(r.cheque or 0)
            other = max(0.0, total - (cash + upi + cheque))
            results.append(
                DailyCollectionSummary(
                    date=r.receipt_date,
                    total_amount=total,
                    receipt_count=r.count,
                    cash_amount=cash,
                    upi_amount=upi,
                    cheque_amount=cheque,
                    other_amount=other,
                )
            )
        return results

    def get_cash_book_report(
        self, tenant_id: UUID, fy_id: Optional[UUID] = None
    ) -> List[CashBookEntry]:
        opening_balance = 0.0
        if fy_id:
            fy = self.db.get(FinancialYear, fy_id)
            if fy:
                opening_balance = float(fy.opening_balance or 0.0)

        # Collect settled receipts (debit / inflow)
        receipts_stmt = select(Receipt).where(
            Receipt.tenant_id == tenant_id,
            Receipt.status == ReceiptStatus.SETTLED,
        )
        if fy_id:
            receipts_stmt = receipts_stmt.where(Receipt.financial_year_id == fy_id)
        receipts = self.db.execute(receipts_stmt).scalars().all()

        # Collect paid expenses (credit / outflow)
        expenses_stmt = select(Expense).where(
            Expense.tenant_id == tenant_id,
            Expense.status == "paid",
        )
        if fy_id:
            expenses_stmt = expenses_stmt.where(Expense.financial_year_id == fy_id)
        expenses = self.db.execute(expenses_stmt).scalars().all()

        # Merge & sort timeline
        timeline = []
        for r in receipts:
            timeline.append({
                "date": r.receipt_date,
                "voucher_number": r.receipt_number,
                "entry_type": "Receipt (Income)",
                "particulars": f"Donation received ({r.payment_mode.upper()})",
                "debit": float(r.amount),
                "credit": 0.0,
            })

        for e in expenses:
            timeline.append({
                "date": e.expense_date,
                "voucher_number": e.expense_number,
                "entry_type": "Expense (Payout)",
                "particulars": f"Paid for {e.category} ({e.vendor_name or 'General'})",
                "debit": 0.0,
                "credit": float(e.amount),
            })

        timeline.sort(key=lambda x: x["date"])

        running = opening_balance
        entries = []
        for t in timeline:
            running += (t["debit"] - t["credit"])
            entries.append(
                CashBookEntry(
                    date=t["date"],
                    voucher_number=t["voucher_number"],
                    entry_type=t["entry_type"],
                    particulars=t["particulars"],
                    debit_amount=t["debit"],
                    credit_amount=t["credit"],
                    running_balance=running,
                )
            )
        return entries

    def get_income_expense_statement(
        self, tenant_id: UUID, fy_id: Optional[UUID] = None
    ) -> FinancialReportSummary:
        # Total income from all non-cancelled receipts
        r_stmt = select(func.sum(Receipt.amount)).where(
            Receipt.tenant_id == tenant_id,
            Receipt.status != ReceiptStatus.CANCELLED,
        )
        if fy_id:
            r_stmt = r_stmt.where(Receipt.financial_year_id == fy_id)
        total_income = float(self.db.execute(r_stmt).scalar() or 0.0)

        # Total expenses from approved/paid expenses
        e_stmt = select(func.sum(Expense.amount)).where(
            Expense.tenant_id == tenant_id,
            Expense.status.in_(["approved", "paid"]),
        )
        if fy_id:
            e_stmt = e_stmt.where(Expense.financial_year_id == fy_id)
        total_expenses = float(self.db.execute(e_stmt).scalar() or 0.0)

        fy_name = "All Years"
        if fy_id:
            fy = self.db.get(FinancialYear, fy_id)
            if fy:
                fy_name = fy.name

        return FinancialReportSummary(
            report_title="Income & Expenditure Statement",
            generated_at=datetime.now(timezone.utc).isoformat(),
            financial_year=fy_name,
            total_income=total_income,
            total_expenses=total_expenses,
            net_surplus_deficit=total_income - total_expenses,
            entries=[
                {"category": "Donations & Collections", "amount": total_income, "type": "Income"},
                {"category": "Event & Operational Expenses", "amount": total_expenses, "type": "Expense"},
            ],
        )

    def run_custom_report(self, tenant_id: Optional[UUID], req: Any) -> Any:
        from app.models.donor import Donor
        from app.models.festival import Festival
        from app.models.user import User
        from app.schemas.reports import CustomReportResponse

        entity = (req.entity or "receipts").lower()

        if entity == "receipts":
            query = select(
                Receipt.receipt_date.label("date"),
                Receipt.payment_mode.label("payment_mode"),
                Receipt.purpose.label("category"),
                User.full_name.label("collector"),
                Festival.name.label("festival"),
                func.sum(Receipt.amount).label("total_amount"),
                func.count(Receipt.id).label("count"),
                func.avg(Receipt.amount).label("avg_amount"),
                func.max(Receipt.amount).label("max_amount"),
            ).outerjoin(User, Receipt.collector_id == User.id)\
             .outerjoin(Festival, Receipt.festival_id == Festival.id)

            filters = []
            if tenant_id:
                filters.append(Receipt.tenant_id == tenant_id)
            filters.append(Receipt.status != ReceiptStatus.CANCELLED)

            if req.date_from:
                filters.append(Receipt.receipt_date >= req.date_from)
            if req.date_to:
                filters.append(Receipt.receipt_date <= req.date_to)
            if req.festival_id:
                filters.append(Receipt.festival_id == req.festival_id)
            if req.payment_mode:
                filters.append(Receipt.payment_mode == req.payment_mode)
            if req.min_amount is not None:
                filters.append(Receipt.amount >= req.min_amount)
            if req.max_amount is not None:
                filters.append(Receipt.amount <= req.max_amount)

            query = query.where(and_(*filters)).group_by(
                Receipt.receipt_date,
                Receipt.payment_mode,
                Receipt.purpose,
                User.full_name,
                Festival.name,
            )

            rows = self.db.execute(query).all()

            data = []
            grand_total = 0.0
            for r in rows:
                amt = float(r.total_amount or 0.0)
                grand_total += amt
                data.append({
                    "date": str(r.date) if r.date else "N/A",
                    "payment_mode": str(r.payment_mode.value if hasattr(r.payment_mode, 'value') else (r.payment_mode or 'CASH')).upper(),
                    "category": r.category or "General Donation",
                    "collector": r.collector or "System Admin",
                    "festival": r.festival or "General",
                    "total_amount": round(amt, 2),
                    "count": int(r.count or 0),
                    "avg_amount": round(float(r.avg_amount or 0.0), 2),
                    "max_amount": round(float(r.max_amount or 0.0), 2),
                })

            return CustomReportResponse(
                entity="receipts",
                dimensions=req.dimensions or ["date", "collector", "payment_mode"],
                metrics=req.metrics or ["total_amount", "count"],
                total_records=len(data),
                grand_total_amount=round(grand_total, 2),
                data=data,
            )

        elif entity == "expenses":
            query = select(
                Expense.expense_date.label("date"),
                Expense.category.label("category"),
                User.full_name.label("collector"),
                Festival.name.label("festival"),
                func.sum(Expense.amount).label("total_amount"),
                func.count(Expense.id).label("count"),
                func.avg(Expense.amount).label("avg_amount"),
                func.max(Expense.amount).label("max_amount"),
            ).outerjoin(User, Expense.requested_by == User.id)\
             .outerjoin(Festival, Expense.festival_id == Festival.id)

            filters = []
            if tenant_id:
                filters.append(Expense.tenant_id == tenant_id)
            filters.append(Expense.status.in_(["approved", "paid"]))

            if req.date_from:
                filters.append(Expense.expense_date >= req.date_from)
            if req.date_to:
                filters.append(Expense.expense_date <= req.date_to)
            if req.festival_id:
                filters.append(Expense.festival_id == req.festival_id)
            if req.min_amount is not None:
                filters.append(Expense.amount >= req.min_amount)
            if req.max_amount is not None:
                filters.append(Expense.amount <= req.max_amount)

            query = query.where(and_(*filters)).group_by(Expense.expense_date, Expense.category, User.full_name, Festival.name)
            rows = self.db.execute(query).all()

            data = []
            grand_total = 0.0
            for r in rows:
                amt = float(r.total_amount or 0.0)
                grand_total += amt
                data.append({
                    "date": str(r.date) if r.date else "N/A",
                    "category": r.category or "General Expense",
                    "collector": r.collector or "System Admin",
                    "festival": r.festival or "General",
                    "total_amount": round(amt, 2),
                    "count": int(r.count or 0),
                    "avg_amount": round(float(r.avg_amount or 0.0), 2),
                    "max_amount": round(float(r.max_amount or 0.0), 2),
                })

            return CustomReportResponse(
                entity="expenses",
                dimensions=req.dimensions or ["date", "category", "festival"],
                metrics=req.metrics or ["total_amount", "count"],
                total_records=len(data),
                grand_total_amount=round(grand_total, 2),
                data=data,
            )

        else: # Donors
            query = select(
                Donor.full_name.label("collector"),
                Donor.city.label("category"),
                func.sum(Receipt.amount).label("total_amount"),
                func.count(Receipt.id).label("count"),
                func.avg(Receipt.amount).label("avg_amount"),
                func.max(Receipt.amount).label("max_amount"),
            ).outerjoin(Receipt, Receipt.donor_id == Donor.id)

            filters = []
            if tenant_id:
                filters.append(Donor.tenant_id == tenant_id)

            query = query.where(and_(*filters)).group_by(Donor.id, Donor.full_name, Donor.city)
            rows = self.db.execute(query).all()

            data = []
            grand_total = 0.0
            for r in rows:
                amt = float(r.total_amount or 0.0)
                grand_total += amt
                data.append({
                    "date": "Lifetime",
                    "category": r.category or "Local",
                    "collector": r.collector or "Anonymous",
                    "festival": "All",
                    "total_amount": round(amt, 2),
                    "count": int(r.count or 0),
                    "avg_amount": round(float(r.avg_amount or 0.0), 2),
                    "max_amount": round(float(r.max_amount or 0.0), 2),
                })

            return CustomReportResponse(
                entity="donors",
                dimensions=req.dimensions or ["collector", "category"],
                metrics=req.metrics or ["total_amount", "count"],
                total_records=len(data),
                grand_total_amount=round(grand_total, 2),
                data=data,
            )
