"""
Pydantic schemas for Receipt and Cash Settlement modules.
"""
from datetime import date
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import Field

from app.models.finance import SettlementStatus
from app.models.receipt import PaymentMode
from app.models.receipt import ReceiptStatus
from app.schemas.donor import DonorResponse


class ReceiptBase(BaseModel):
    financial_year_id: UUID | None = None
    festival_id: UUID | None = None
    donor_id: UUID
    amount: float = Field(..., gt=0)
    payment_mode: PaymentMode = PaymentMode.CASH
    cheque_number: str | None = None
    cheque_date: date | None = None
    bank_name: str | None = None
    upi_reference: str | None = None
    transaction_ref: str | None = None
    purpose: str | None = None
    notes: str | None = None


class ReceiptCreate(ReceiptBase):
    receipt_date: date | None = None


class ReceiptCancel(BaseModel):
    reason: str | None = "Cancelled by user"


class ReceiptUpdate(BaseModel):
    amount: float | None = Field(None, gt=0)
    payment_mode: PaymentMode | None = None
    receipt_date: date | None = None
    donor_id: UUID | None = None
    purpose: str | None = None
    notes: str | None = None
    upi_reference: str | None = None
    cheque_number: str | None = None
    bank_name: str | None = None
    transaction_ref: str | None = None
    festival_id: UUID | None = None


class ReceiptResponse(ReceiptBase):
    id: UUID
    tenant_id: UUID
    collector_id: UUID
    collector_name: str | None = None
    receipt_number: str
    receipt_date: date
    status: ReceiptStatus
    cancel_reason: str | None = None
    settlement_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    donor: DonorResponse | None = None

    model_config = {"from_attributes": True}


# ── Cash Settlement Schemas ──
class CashSettlementCreate(BaseModel):
    financial_year_id: UUID | None = None
    festival_id: UUID | None = None
    receipt_ids: list[UUID]
    settlement_date: date | None = None
    notes: str | None = None


class CashSettlementVerify(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    rejection_reason: str | None = None
    notes: str | None = None


class CashSettlementResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    financial_year_id: UUID
    festival_id: UUID | None = None
    collector_id: UUID
    settlement_number: str
    settlement_date: date
    total_amount: float
    receipt_count: int
    status: SettlementStatus
    submitted_at: datetime | None = None
    verified_by: UUID | None = None
    verified_at: datetime | None = None
    approved_by: UUID | None = None
    approved_at: datetime | None = None
    notes: str | None = None
    rejection_reason: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReceiptListResponse(BaseModel):
    items: list["ReceiptResponse"]
    total: int


class PublicReceiptVerificationResponse(BaseModel):
    id: UUID
    receipt_number: str
    receipt_date: date
    amount: float
    payment_mode: PaymentMode
    status: ReceiptStatus
    donor_name: str
    purpose: str | None = None
    transaction_ref: str | None = None
    org_name: str
    org_logo_url: str | None = None
    verified_at: datetime | None = None
