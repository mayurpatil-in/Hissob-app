"""
Pydantic schemas for Receipt and Cash Settlement modules.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from app.models.receipt import PaymentMode, ReceiptStatus
from app.models.finance import SettlementStatus
from app.schemas.donor import DonorResponse


class ReceiptBase(BaseModel):
    financial_year_id: Optional[UUID] = None
    festival_id: Optional[UUID] = None
    donor_id: UUID
    amount: float = Field(..., gt=0)
    payment_mode: PaymentMode = PaymentMode.CASH
    cheque_number: Optional[str] = None
    cheque_date: Optional[date] = None
    bank_name: Optional[str] = None
    upi_reference: Optional[str] = None
    transaction_ref: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None


class ReceiptCreate(ReceiptBase):
    receipt_date: Optional[date] = None


class ReceiptCancel(BaseModel):
    reason: Optional[str] = "Cancelled by user"


class ReceiptUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    payment_mode: Optional[PaymentMode] = None
    receipt_date: Optional[date] = None
    donor_id: Optional[UUID] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None
    upi_reference: Optional[str] = None
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    transaction_ref: Optional[str] = None
    festival_id: Optional[UUID] = None


class ReceiptResponse(ReceiptBase):
    id: UUID
    tenant_id: UUID
    collector_id: UUID
    collector_name: Optional[str] = None
    receipt_number: str
    receipt_date: date
    status: ReceiptStatus
    cancel_reason: Optional[str] = None
    settlement_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    donor: Optional[DonorResponse] = None

    model_config = {"from_attributes": True}


# ── Cash Settlement Schemas ──
class CashSettlementCreate(BaseModel):
    financial_year_id: Optional[UUID] = None
    festival_id: Optional[UUID] = None
    receipt_ids: List[UUID]
    settlement_date: Optional[date] = None
    notes: Optional[str] = None


class CashSettlementVerify(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None


class CashSettlementResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    financial_year_id: UUID
    festival_id: Optional[UUID] = None
    collector_id: UUID
    settlement_number: str
    settlement_date: date
    total_amount: float
    receipt_count: int
    status: SettlementStatus
    submitted_at: Optional[datetime] = None
    verified_by: Optional[UUID] = None
    verified_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReceiptListResponse(BaseModel):
    items: List["ReceiptResponse"]
    total: int


class PublicReceiptVerificationResponse(BaseModel):
    id: UUID
    receipt_number: str
    receipt_date: date
    amount: float
    payment_mode: PaymentMode
    status: ReceiptStatus
    donor_name: str
    purpose: Optional[str] = None
    transaction_ref: Optional[str] = None
    org_name: str
    org_logo_url: Optional[str] = None
    verified_at: Optional[datetime] = None
