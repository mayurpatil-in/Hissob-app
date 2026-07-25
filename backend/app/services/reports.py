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
