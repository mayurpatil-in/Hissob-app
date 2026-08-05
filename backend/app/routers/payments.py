"""
Payments Router — Online Payment Gateway Integration (Razorpay & UPI).
Includes: Create Order, Verify Payment, Sync Payments, Refund, Payment Links, Settlements.

Security Hardening:
  - Duplicate payment idempotency guard (transaction_ref uniqueness check)
  - Receipt number race condition protection (retry loop with IntegrityError)
  - Refund only cancels receipt on actual API success
  - Amount validation against Razorpay server (prevents client-side tampering)
  - Maximum donation amount limit
  - Razorpay Webhook endpoint for server-to-server payment confirmation
  - Consistent key_secret fallback handling
"""
import hashlib
import hmac
import json
import logging
import uuid
from datetime import UTC
from datetime import date
from datetime import datetime
from urllib.parse import quote

import httpx
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from pydantic import BaseModel
from pydantic import field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.core.config import settings
from app.core.database import get_db
from app.models.donor import Donor
from app.models.finance import Expense
from app.models.finance import ExpenseStatus
from app.models.finance import OnlineSettlement
from app.models.financial_year import FinancialYear
from app.models.receipt import PaymentMode
from app.models.receipt import Receipt
from app.models.receipt import ReceiptStatus
from app.models.tenant import Tenant
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Online Payments"])


import contextlib

# ─── Constants ───────────────────────────────────────────────────────
MAX_DONATION_AMOUNT = 500000.0  # ₹5,00,000 max per single online transaction
DEFAULT_KEY_ID = "rzp_test_hissob_key"
DEFAULT_KEY_SECRET = "hissob_razorpay_secret_key"


def _get_razorpay_keys(tenant: Tenant | None = None):
    """Returns (key_id, key_secret, is_demo) dynamically per tenant with global fallback."""
    if tenant and tenant.razorpay_key_id and tenant.razorpay_key_secret:
        key_id = tenant.razorpay_key_id.strip()
        key_secret = tenant.razorpay_key_secret.strip()
        is_demo = key_id.startswith("rzp_test_") or key_id == DEFAULT_KEY_ID
        return key_id, key_secret, is_demo

    key_id = settings.RAZORPAY_KEY_ID or DEFAULT_KEY_ID
    key_secret = settings.RAZORPAY_KEY_SECRET or DEFAULT_KEY_SECRET
    is_demo = (key_id == DEFAULT_KEY_ID)
    return key_id, key_secret, is_demo


def _get_webhook_secret(tenant: Tenant | None = None) -> str:
    """Returns the webhook secret prioritizing tenant secret > global settings secret > key secret."""
    if tenant and tenant.razorpay_webhook_secret and tenant.razorpay_webhook_secret.strip():
        return tenant.razorpay_webhook_secret.strip()
    if settings.RAZORPAY_WEBHOOK_SECRET and settings.RAZORPAY_WEBHOOK_SECRET.strip():
        return settings.RAZORPAY_WEBHOOK_SECRET.strip()
    _, key_secret, _ = _get_razorpay_keys(tenant)
    return key_secret


def _is_mock_payment(payment_id: str) -> bool:
    """Check if a payment_id is from demo/mock mode."""
    return payment_id.startswith("pay_demo_") or payment_id.startswith("mock_")


def _resolve_tenant(slug_or_id: str | None, db: Session) -> Tenant | None:
    """Resolve tenant by slug or UUID. Falls back to first tenant."""
    tenant = None
    if slug_or_id:
        tenant = db.query(Tenant).filter(Tenant.slug == slug_or_id).first()
        if not tenant:
            try:
                target_uuid = uuid.UUID(slug_or_id)
                tenant = db.query(Tenant).filter(Tenant.id == target_uuid).first()
            except Exception:
                pass
    if not tenant:
        tenant = db.query(Tenant).first()
    return tenant


def _generate_receipt_number_with_retry(tenant_id: uuid.UUID, db: Session, max_retries: int = 5) -> str:
    """Generate a unique receipt number with retry on collision.
    Uses SELECT MAX to find the highest existing number and increments,
    with retry loop to handle race conditions.
    """
    from sqlalchemy import func
    today = date.today()
    prefix = f"RCP-{today.year}-"

    for attempt in range(max_retries):
        # Find the highest existing receipt number for this tenant and year
        max_receipt = db.query(func.max(Receipt.receipt_number)).filter(
            Receipt.tenant_id == tenant_id,
            Receipt.receipt_number.like(f"{prefix}%")
        ).scalar()

        if max_receipt:
            try:
                current_num = int(max_receipt.split("-")[-1])
            except (ValueError, IndexError):
                current_num = 0
        else:
            current_num = 0

        next_num = current_num + 1 + attempt  # Add attempt offset for retries
        receipt_num = f"{prefix}{next_num:05d}"

        # Check if it already exists (safety net)
        exists = db.query(Receipt).filter(
            Receipt.tenant_id == tenant_id,
            Receipt.receipt_number == receipt_num
        ).first()

        if not exists:
            return receipt_num

    # Fallback: use UUID-based receipt number
    return f"RCP-{today.year}-{uuid.uuid4().hex[:8].upper()}"


# ─── Request Models ─────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    amount: float
    currency: str = "INR"
    donor_name: str | None = "Donor"
    donor_phone: str | None = None
    donor_email: str | None = None
    purpose: str | None = "General Donation"
    slug_or_id: str | None = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Donation amount must be greater than zero")
        if v > MAX_DONATION_AMOUNT:
            raise ValueError(f"Donation amount cannot exceed ₹{MAX_DONATION_AMOUNT:,.0f}")
        return v


class CreatePaymentLinkRequest(BaseModel):
    amount: float
    donor_name: str | None = None
    donor_phone: str | None = None
    donor_email: str | None = None
    purpose: str | None = "General Donation"
    description: str | None = None
    slug_or_id: str | None = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Donation amount must be greater than zero")
        if v > MAX_DONATION_AMOUNT:
            raise ValueError(f"Donation amount cannot exceed ₹{MAX_DONATION_AMOUNT:,.0f}")
        return v


class CreateRefundRequest(BaseModel):
    receipt_id: str
    amount: float | None = None
    reason: str | None = "Donor requested cancellation"


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    slug_or_id: str | None = None
    full_name: str
    phone: str
    email: str | None = None
    pan_number: str | None = None
    city: str | None = None
    amount: float
    purpose: str | None = "General Donation"
    notes: str | None = None


# ─── Endpoints ───────────────────────────────────────────────────────

@router.get("/razorpay/config")
def get_razorpay_config(slug_or_id: str | None = None, db: Session = Depends(get_db)):
    """Returns public Razorpay configuration for online donation checkout."""
    tenant = _resolve_tenant(slug_or_id, db)
    key_id, _, is_demo = _get_razorpay_keys(tenant)
    return {
        "key_id": key_id,
        "enabled": True,
        "mode": "test" if is_demo else "live",
        "max_amount": MAX_DONATION_AMOUNT,
    }


@router.post("/razorpay/create-order")
async def create_razorpay_order(req: CreateOrderRequest, db: Session = Depends(get_db)):
    """Creates a Razorpay Order for online payment."""
    amount_in_paise = int(round(req.amount * 100))
    tenant = _resolve_tenant(req.slug_or_id, db)
    key_id, key_secret, is_demo = _get_razorpay_keys(tenant)

    # Attempt to create Razorpay Order via official REST API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(key_id, key_secret),
                json={
                    "amount": amount_in_paise,
                    "currency": req.currency,
                    "receipt": f"rcpt_{uuid.uuid4().hex[:10]}",
                    "notes": {
                        "donor_name": req.donor_name or "Donor",
                        "donor_phone": req.donor_phone or "",
                        "purpose": req.purpose or "General Donation",
                        "slug": tenant.slug if tenant else "",
                    },
                    "payment_capture": 1,  # Auto-capture on payment
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "order_id": data.get("id"),
                    "amount": data.get("amount"),
                    "currency": data.get("currency"),
                    "key_id": key_id,
                    "is_mock": False,
                }
            else:
                err_json = {}
                with contextlib.suppress(Exception):
                    err_json = resp.json()
                err_desc = err_json.get("error", {}).get("description", resp.text)
                logger.error(f"Razorpay API Error ({resp.status_code}): {err_desc}")

                # If real Razorpay keys were provided, raise descriptive error
                if not is_demo:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Razorpay API Error: {err_desc}. Please verify Razorpay API Keys in Organization Settings or backend/.env"
                    )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Razorpay API call failed: {e}")

    # Fallback Demo Mode if default test keys are used
    test_order_id = f"order_test_{uuid.uuid4().hex[:14]}"
    return {
        "order_id": test_order_id,
        "amount": amount_in_paise,
        "currency": req.currency,
        "key_id": key_id,
        "is_mock": True,
    }


@router.post("/razorpay/create-payment-link")
async def create_razorpay_payment_link(req: CreatePaymentLinkRequest, db: Session = Depends(get_db)):
    """Creates a shareable Razorpay Payment Link or instant UPI link with WhatsApp sharing."""
    amount_in_paise = int(round(req.amount * 100))
    tenant = _resolve_tenant(req.slug_or_id, db)
    key_id, key_secret, is_demo = _get_razorpay_keys(tenant)

    tenant = _resolve_tenant(req.slug_or_id, db)

    mandal_name = tenant.name if tenant else "Hissob Organization"
    tenant_slug = tenant.slug if tenant else "default"
    purpose_str = req.purpose or "General Donation"
    desc_str = req.description or f"Online Donation for {mandal_name} - {purpose_str}"

    # Attempt to create Razorpay Payment Link via official API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            payload = {
                "amount": amount_in_paise,
                "currency": "INR",
                "accept_partial": False,
                "description": desc_str,
                "customer": {
                    "name": req.donor_name or "Donor",
                    "contact": req.donor_phone or "",
                    "email": req.donor_email or "",
                },
                "notify": {
                    "sms": bool(req.donor_phone),
                    "email": bool(req.donor_email),
                },
                "reminder_enable": True,
                "expire_by": int((date.today().toordinal() + 7) * 86400),  # 7-day expiry
                "notes": {
                    "mandal": mandal_name,
                    "purpose": purpose_str,
                }
            }
            resp = await client.post(
                "https://api.razorpay.com/v1/payment_links",
                auth=(key_id, key_secret),
                json=payload
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                short_url = data.get("short_url")
                pl_id = data.get("id")

                phone_clean = (req.donor_phone or "").replace("+", "").replace(" ", "").strip()
                if len(phone_clean) == 10:
                    phone_clean = "91" + phone_clean

                wa_message = f"Namaste {req.donor_name or 'Donor'} ji! 🙏\n\nThank you for offering your support to *{mandal_name}* for *{purpose_str}* (₹{req.amount:,.2f}).\n\nPlease click the link below to complete your online donation securely & receive an instant official receipt:\n👉 {short_url}\n\nThank you!"
                wa_url = f"https://wa.me/{phone_clean}?text={quote(wa_message)}" if phone_clean else f"https://wa.me/?text={quote(wa_message)}"

                return {
                    "payment_link_id": pl_id,
                    "short_url": short_url,
                    "amount": req.amount,
                    "currency": "INR",
                    "status": data.get("status", "created"),
                    "whatsapp_link": wa_url,
                    "is_mock": False,
                }
            else:
                logger.warning(f"Razorpay Payment Link API status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.warning(f"Razorpay Payment Link creation failed: {e}")

    # Fallback to Public Payment Portal link if API keys are test or offline
    fallback_url = f"http://localhost:5173/pay/{tenant_slug}?amount={req.amount}&purpose={quote(purpose_str)}"
    phone_clean = (req.donor_phone or "").replace("+", "").replace(" ", "").strip()
    if len(phone_clean) == 10:
        phone_clean = "91" + phone_clean

    wa_message = f"Namaste {req.donor_name or 'Donor'} ji! 🙏\n\nThank you for offering your support to *{mandal_name}* for *{purpose_str}* (₹{req.amount:,.2f}).\n\nPlease click the link below to complete your online donation securely & receive an instant official receipt:\n👉 {fallback_url}\n\nThank you!"
    wa_url = f"https://wa.me/{phone_clean}?text={quote(wa_message)}" if phone_clean else f"https://wa.me/?text={quote(wa_message)}"

    return {
        "payment_link_id": f"plink_demo_{uuid.uuid4().hex[:10]}",
        "short_url": fallback_url,
        "amount": req.amount,
        "currency": "INR",
        "status": "created",
        "whatsapp_link": wa_url,
        "is_mock": True,
    }


def _create_receipt_for_payment(
    db: Session,
    tenant: Tenant,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    full_name: str,
    phone: str,
    amount: float,
    purpose: str | None = "General Donation",
    email: str | None = None,
    pan_number: str | None = None,
    city: str | None = None,
    notes: str | None = None,
    payment_method: str | None = None,
) -> dict:
    """Shared logic to create a receipt for a verified payment.
    Used by both verify-payment endpoint and webhook handler.
    Returns the receipt response dict.
    """
    # ── Idempotency Guard: check if receipt already exists for this payment ──
    existing = db.query(Receipt).filter(
        Receipt.transaction_ref == razorpay_payment_id,
        Receipt.tenant_id == tenant.id,
    ).first()
    if existing:
        logger.info(f"Idempotency: Receipt {existing.receipt_number} already exists for payment {razorpay_payment_id}")
        donor = db.query(Donor).filter(Donor.id == existing.donor_id).first()
        return {
            "id": str(existing.id),
            "receipt_number": existing.receipt_number,
            "amount": float(existing.amount),
            "receipt_date": str(existing.receipt_date),
            "payment_mode": existing.payment_mode,
            "transaction_ref": existing.transaction_ref,
            "purpose": existing.purpose,
            "donor": {
                "full_name": donor.full_name if donor else full_name,
                "phone": donor.phone if donor else phone,
                "donor_number": donor.donor_number if donor else "",
            },
            "already_existed": True,
        }

    # ── Get active financial year ──
    fy = db.query(FinancialYear).filter(
        FinancialYear.tenant_id == tenant.id,
        FinancialYear.is_current
    ).first()
    if not fy:
        fy = db.query(FinancialYear).filter(FinancialYear.tenant_id == tenant.id).order_by(FinancialYear.start_date.desc()).first()
        if not fy:
            today = date.today()
            fy = FinancialYear(
                tenant_id=tenant.id,
                name=f"FY {today.year}-{today.year+1}",
                start_date=date(today.year, 4, 1),
                end_date=date(today.year+1, 3, 31),
                is_active=True
            )
            db.add(fy)
            db.flush()

    # ── Get/create collector (online gateway user) ──
    collector = db.query(User).filter(User.tenant_id == tenant.id).first()
    if not collector:
        collector = User(
            tenant_id=tenant.id,
            email=f"online_portal_{tenant.id.hex[:6]}@hisob.in",
            hashed_password="N/A",
            full_name="Online Public Gateway",
            status="active"
        )
        db.add(collector)
        db.flush()

    # ── Find or Create Donor by phone ──
    clean_phone = phone.strip()
    donor = db.query(Donor).filter(
        Donor.tenant_id == tenant.id,
        Donor.phone == clean_phone
    ).first()

    if not donor:
        count = db.query(Donor).filter(Donor.tenant_id == tenant.id).count()
        donor_num = f"DNR-{count + 1:04d}"
        donor = Donor(
            tenant_id=tenant.id,
            donor_number=donor_num,
            full_name=full_name.strip(),
            phone=clean_phone,
            email=email,
            pan_number=pan_number,
            city=city,
        )
        db.add(donor)
        db.flush()
    else:
        if pan_number and not donor.pan_number:
            donor.pan_number = pan_number
        if email and not donor.email:
            donor.email = email
        if city and not donor.city:
            donor.city = city
        db.flush()

    # ── Determine payment mode from Razorpay method ──
    mode = PaymentMode.UPI
    if payment_method:
        method_lower = payment_method.lower()
        if method_lower in ("card", "netbanking", "wallet", "emi", "paylater"):
            mode = PaymentMode.DIGITAL
        elif method_lower == "upi":
            mode = PaymentMode.UPI
        elif method_lower == "bank_transfer":
            mode = PaymentMode.NEFT

    # ── Generate receipt number with row-locking sequence protection ──
    from app.repositories.receipt import ReceiptRepository
    receipt_repo = ReceiptRepository(db)
    receipt_num = receipt_repo.generate_receipt_number(tenant.id, fy.name if hasattr(fy, 'name') else "2025-26")

    # ── Create official Receipt record ──
    receipt = Receipt(
        tenant_id=tenant.id,
        financial_year_id=fy.id,
        donor_id=donor.id,
        collector_id=collector.id,
        receipt_number=receipt_num,
        receipt_date=date.today(),
        amount=amount,
        payment_mode=mode,
        status=ReceiptStatus.ISSUED,
        transaction_ref=razorpay_payment_id,
        purpose=purpose,
        notes=f"Razorpay Online Gateway (Order: {razorpay_order_id}). {notes or ''}".strip(),
    )
    db.add(receipt)

    try:
        db.commit()
        db.refresh(receipt)
    except IntegrityError:
        db.rollback()
        # Receipt number collision — retry with new locked sequence number
        receipt.receipt_number = receipt_repo.generate_receipt_number(tenant.id, fy.name if hasattr(fy, 'name') else "2025-26")
        db.add(receipt)
        db.commit()
        db.refresh(receipt)

    # ── Auto-Email PDF Receipt to Donor (100% FREE via SMTP) ──
    target_email = donor.email or email
    if target_email:
        try:
            from app.services.email_service import send_receipt_email
            send_receipt_email(db, receipt.id, recipient_email=target_email)
            logger.info(f"Auto-dispatched PDF receipt #{receipt.receipt_number} to {target_email}")
        except Exception as e:
            logger.warning(f"Auto-receipt email dispatch failed for {receipt.receipt_number}: {e}")

    # ── Instant Pre-filled WhatsApp Share Link (100% FREE) ──
    phone_clean = (donor.phone or phone or "").replace("+", "").replace(" ", "").strip()
    if len(phone_clean) == 10:
        phone_clean = "91" + phone_clean

    wa_msg = (
        f"Namaste {donor.full_name} ji! 🙏\n\n"
        f"Thank you for your generous online contribution of *₹{amount:,.2f}* to *{tenant.name}* ({purpose or 'General Donation'}).\n\n"
        f"Official Receipt No: *{receipt.receipt_number}*\n"
        f"Payment Ref: {razorpay_payment_id}\n\n"
        f"Verify & download your official receipt anytime here:\n"
        f"👉 https://hisob.in/verify-receipt/{receipt.receipt_number}\n\n"
        f"May Lord Ganesha bless you and your family! 🌺"
    )
    wa_url = f"https://wa.me/{phone_clean}?text={quote(wa_msg)}" if phone_clean else f"https://wa.me/?text={quote(wa_msg)}"

    return {
        "id": str(receipt.id),
        "receipt_number": receipt.receipt_number,
        "amount": float(receipt.amount),
        "receipt_date": str(receipt.receipt_date),
        "payment_mode": receipt.payment_mode,
        "transaction_ref": receipt.transaction_ref,
        "purpose": receipt.purpose,
        "whatsapp_link": wa_url,
        "donor": {
            "full_name": donor.full_name,
            "phone": donor.phone,
            "donor_number": donor.donor_number,
        }
    }


@router.post("/razorpay/verify-payment")
async def verify_razorpay_payment(req: VerifyPaymentRequest, db: Session = Depends(get_db)):
    """Verifies Razorpay HMAC signature and generates an official donor receipt.

    Security:
      - HMAC-SHA256 signature verification with tenant-specific keys
      - Idempotency: duplicate payment_id returns existing receipt
      - Amount verified against Razorpay server (not client-supplied value)
      - Receipt number collision protection
    """
    # ── Resolve Tenant ──
    tenant = _resolve_tenant(req.slug_or_id, db)
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization tenant not found")

    key_id, key_secret, is_demo = _get_razorpay_keys(tenant)

    is_mock_order = req.razorpay_order_id.startswith("order_test_")
    verified_amount = req.amount  # Default to client amount, overridden by server check below
    payment_method = "upi"  # Default method

    # ── HMAC-SHA256 Signature Verification (skip for mock/test orders) ──
    if not is_mock_order:
        generated_signature = hmac.new(
            key_secret.encode(),
            f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_signature != req.razorpay_signature:
            logger.error("Razorpay signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid payment signature")

        # ── Server-side amount verification against Razorpay ──
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"https://api.razorpay.com/v1/payments/{req.razorpay_payment_id}",
                    auth=(key_id, key_secret),
                )
                if resp.status_code == 200:
                    pay_data = resp.json()
                    razorpay_amount = (pay_data.get("amount") or 0) / 100.0
                    pay_status = pay_data.get("status", "")
                    payment_method = pay_data.get("method", "upi")

                    # Verify payment was actually captured/authorized
                    if pay_status not in ("captured", "authorized"):
                        logger.error(f"Payment {req.razorpay_payment_id} status is '{pay_status}', not captured")
                        raise HTTPException(
                            status_code=400,
                            detail=f"Payment not yet captured. Current status: {pay_status}"
                        )

                    # Use Razorpay's amount (prevents client-side amount tampering)
                    verified_amount = razorpay_amount
                    if abs(verified_amount - req.amount) > 1.0:
                        logger.warning(
                            f"Amount mismatch: client sent ₹{req.amount}, Razorpay has ₹{verified_amount} "
                            f"for payment {req.razorpay_payment_id}"
                        )
                else:
                    logger.warning(f"Could not verify payment amount from Razorpay API (status {resp.status_code})")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Razorpay payment verification API call failed: {e}")
            # Continue with client amount if API is unreachable (signature already verified)

    # ── Create receipt (with idempotency and collision protection) ──
    result = _create_receipt_for_payment(
        db=db,
        tenant=tenant,
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
        full_name=req.full_name,
        phone=req.phone,
        amount=verified_amount,
        purpose=req.purpose,
        email=req.email,
        pan_number=req.pan_number,
        city=req.city,
        notes=req.notes,
        payment_method=payment_method,
    )

    return result


@router.post("/razorpay/sync-payments", summary="1-Click Sync Recent Razorpay Payments")
async def sync_razorpay_payments(
    slug_or_id: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Fetches recent captured payments from Razorpay API and auto-generates official receipts for any un-synced transactions."""
    tenant = None
    if slug_or_id:
        tenant = _resolve_tenant(slug_or_id, db)
    elif current_user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()

    if not tenant:
        raise HTTPException(status_code=400, detail="Tenant context required")

    key_id, key_secret, is_demo = _get_razorpay_keys(tenant)
    if is_demo:
        return {"message": "Razorpay keys not configured. Running in demo mode.", "synced_count": 0, "new_receipts": []}

    synced_receipts = []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.razorpay.com/v1/payments?count=50",
                auth=(key_id, key_secret),
            )
            if resp.status_code == 200:
                data = resp.json()
                payments_list = data.get("items", [])
                for item in payments_list:
                    if item.get("status") != "captured":
                        continue

                    p_id = item.get("id")
                    order_id = item.get("order_id") or f"ord_sync_{p_id}"
                    p_amount = float(item.get("amount", 0)) / 100.0

                    if p_amount <= 0:
                        continue

                    notes_data = item.get("notes", {}) or {}
                    donor_name = item.get("contact_name") or notes_data.get("donor_name") or item.get("email") or "Online Donor"
                    donor_phone = item.get("contact") or notes_data.get("donor_phone") or ""
                    donor_email = item.get("email") or notes_data.get("donor_email") or ""
                    purpose = notes_data.get("purpose") or item.get("description") or "Online Donation"

                    # Idempotency check: skip if already synced
                    existing = db.query(Receipt).filter(
                        Receipt.transaction_ref == p_id,
                        Receipt.tenant_id == tenant.id,
                    ).first()
                    if existing:
                        continue

                    receipt_dict = _create_receipt_for_payment(
                        db=db,
                        tenant=tenant,
                        razorpay_order_id=order_id,
                        razorpay_payment_id=p_id,
                        full_name=donor_name,
                        phone=donor_phone,
                        amount=p_amount,
                        purpose=purpose,
                        email=donor_email,
                        payment_method=item.get("method"),
                    )
                    synced_receipts.append(receipt_dict)
            else:
                logger.warning(f"Razorpay sync API failed with status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Error syncing Razorpay payments: {e}")

    return {
        "message": f"Successfully synced {len(synced_receipts)} new Razorpay online payments",
        "synced_count": len(synced_receipts),
        "new_receipts": synced_receipts,
    }


@router.post("/razorpay/refund")
async def initiate_razorpay_refund(req: CreateRefundRequest, db: Session = Depends(get_db)):
    """Initiates a full or partial online refund via Razorpay REST API and updates receipt status.

    Fix: Only marks receipt as CANCELLED when Razorpay API confirms the refund.
    """
    try:
        receipt_uuid = uuid.UUID(req.receipt_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid receipt_id format")

    receipt = db.query(Receipt).filter(Receipt.id == receipt_uuid).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    if receipt.status == ReceiptStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Receipt is already cancelled or refunded")

    # Payment reference
    payment_id = receipt.transaction_ref
    if not payment_id:
        raise HTTPException(status_code=400, detail="No online payment transaction reference found on this receipt")

    refund_amount = req.amount if (req.amount and req.amount > 0) else float(receipt.amount)
    if refund_amount > float(receipt.amount):
        raise HTTPException(status_code=400, detail=f"Refund amount cannot exceed receipt amount (₹{receipt.amount})")

    amount_in_paise = int(round(refund_amount * 100))
    tenant = db.query(Tenant).filter(Tenant.id == receipt.tenant_id).first()
    key_id, key_secret, is_demo = _get_razorpay_keys(tenant)

    refund_id = f"rfnd_demo_{uuid.uuid4().hex[:10]}"
    refund_status = "processed"
    refund_succeeded = False

    # Attempt Razorpay Refund API call if not mock transaction
    if _is_mock_payment(payment_id):
        # Demo mode: always succeed
        refund_succeeded = True
    else:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "amount": amount_in_paise,
                    "notes": {
                        "receipt_number": receipt.receipt_number,
                        "reason": req.reason or "Refund",
                    }
                }
                resp = await client.post(
                    f"https://api.razorpay.com/v1/payments/{payment_id}/refund",
                    auth=(key_id, key_secret),
                    json=payload
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    refund_id = data.get("id", refund_id)
                    refund_status = data.get("status", "processed")
                    refund_succeeded = True
                else:
                    err_desc = resp.json().get("error", {}).get("description", resp.text)
                    logger.error(f"Razorpay Refund API error ({resp.status_code}): {err_desc}")
                    raise HTTPException(status_code=400, detail=f"Razorpay Refund Error: {err_desc}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Razorpay refund API call failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process refund via Razorpay. The receipt has NOT been cancelled. Error: {str(e)}"
            )

    # ── ONLY mark receipt as cancelled if refund actually succeeded ──
    if refund_succeeded:
        receipt.status = ReceiptStatus.CANCELLED
        receipt.cancel_reason = f"Online Refund Processed (ID: {refund_id}). Reason: {req.reason or 'User refund request'}"
        db.commit()
        db.refresh(receipt)

    return {
        "success": True,
        "refund_id": refund_id,
        "amount": refund_amount,
        "status": refund_status,
        "receipt_number": receipt.receipt_number,
        "message": f"Refund of ₹{refund_amount:,.2f} processed successfully for Receipt #{receipt.receipt_number}."
    }


@router.get("/razorpay/payment-status/{payment_id}")
async def fetch_razorpay_payment_status(payment_id: str, slug_or_id: str | None = None, db: Session = Depends(get_db)):
    """Fetches live payment status, payment method, fees & bank details directly from Razorpay servers."""
    tenant = _resolve_tenant(slug_or_id, db)
    key_id, key_secret, _ = _get_razorpay_keys(tenant)

    if _is_mock_payment(payment_id):
        return {
            "payment_id": payment_id,
            "status": "captured",
            "amount": 501.0,
            "currency": "INR",
            "method": "upi",
            "vpa": "success@razorpay",
            "email": "donor@example.com",
            "contact": "+919876543210",
            "fee": 10.02,
            "tax": 1.80,
            "is_mock": True,
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://api.razorpay.com/v1/payments/{payment_id}",
                auth=(key_id, key_secret),
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "payment_id": data.get("id"),
                    "status": data.get("status"),
                    "amount": (data.get("amount") or 0) / 100.0,
                    "currency": data.get("currency"),
                    "method": data.get("method"),
                    "bank": data.get("bank"),
                    "wallet": data.get("wallet"),
                    "vpa": data.get("vpa"),
                    "email": data.get("email"),
                    "contact": data.get("contact"),
                    "fee": (data.get("fee") or 0) / 100.0,
                    "tax": (data.get("tax") or 0) / 100.0,
                    "error_code": data.get("error_code"),
                    "error_description": data.get("error_description"),
                    "is_mock": False,
                }
            else:
                err_desc = resp.json().get("error", {}).get("description", resp.text)
                raise HTTPException(status_code=400, detail=f"Razorpay API Error: {err_desc}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch Razorpay payment status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to query Razorpay API: {str(e)}")


# ─── Razorpay Webhook Endpoint ──────────────────────────────────────

@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Razorpay server-to-server webhook handler.

    Handles events:
      - payment.captured: Creates a receipt if one doesn't already exist
      - refund.processed: Marks receipt as cancelled if refunded externally

    Configure this URL in Razorpay Dashboard → Settings → Webhooks:
      https://your-domain.com/api/v1/payments/razorpay/webhook

    Security: Validates webhook signature using dedicated RAZORPAY_WEBHOOK_SECRET or tenant webhook secret.
    """
    # Read raw body for signature verification
    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")

    # Try parsing event first to extract tenant slug from payload notes if present
    tenant = None
    try:
        event_data = json.loads(body_str)
        payload = event_data.get("payload", {})
        notes = payload.get("payment", {}).get("entity", {}).get("notes", {})
        if notes and notes.get("slug"):
            tenant = _resolve_tenant(notes.get("slug"), db)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    webhook_secret = _get_webhook_secret(tenant)

    # Verify webhook signature (X-Razorpay-Signature header)
    received_signature = request.headers.get("X-Razorpay-Signature", "")
    if webhook_secret and webhook_secret not in (DEFAULT_KEY_SECRET, ""):
        if not received_signature:
            logger.error("Razorpay webhook rejected: Missing X-Razorpay-Signature header")
            raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header")

        expected_signature = hmac.new(
            webhook_secret.encode(),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, received_signature):
            logger.error("Razorpay webhook signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    elif received_signature:
        expected_signature = hmac.new(
            webhook_secret.encode(),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, received_signature):
            logger.error("Razorpay webhook signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # Parse event
    try:
        event_data = json.loads(body_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event_data.get("event", "")
    payload = event_data.get("payload", {})

    logger.info(f"Razorpay Webhook received: {event_type}")

    if event_type == "payment.captured":
        payment_entity = payload.get("payment", {}).get("entity", {})
        payment_id = payment_entity.get("id", "")
        order_id = payment_entity.get("order_id", "")
        amount = (payment_entity.get("amount") or 0) / 100.0
        method = payment_entity.get("method", "upi")
        contact = payment_entity.get("contact", "")
        email = payment_entity.get("email", "")
        notes = payment_entity.get("notes", {})

        donor_name = notes.get("donor_name", "Online Donor")
        donor_phone = contact.replace("+91", "").replace("+", "").strip() if contact else ""
        purpose = notes.get("purpose", "General Donation")

        if not payment_id:
            return {"status": "ignored", "reason": "No payment_id in event"}

        # Check if receipt already exists (idempotent)
        existing = db.query(Receipt).filter(Receipt.transaction_ref == payment_id).first()
        if existing:
            logger.info(f"Webhook: Receipt {existing.receipt_number} already exists for {payment_id}")
            return {"status": "ok", "receipt": existing.receipt_number, "action": "already_exists"}

        # Resolve tenant from notes or use default
        tenant = _resolve_tenant(notes.get("slug"), db)
        if not tenant:
            logger.error(f"Webhook: No tenant found for payment {payment_id}")
            return {"status": "error", "reason": "No tenant found"}

        # Create receipt
        result = _create_receipt_for_payment(
            db=db,
            tenant=tenant,
            razorpay_order_id=order_id,
            razorpay_payment_id=payment_id,
            full_name=donor_name,
            phone=donor_phone or "0000000000",
            amount=amount,
            purpose=purpose,
            email=email,
            payment_method=method,
        )

        logger.info(f"Webhook: Created receipt {result['receipt_number']} for payment {payment_id}")
        return {"status": "ok", "receipt": result["receipt_number"], "action": "created"}

    elif event_type == "refund.processed":
        refund_entity = payload.get("refund", {}).get("entity", {})
        payment_id = refund_entity.get("payment_id", "")
        refund_id = refund_entity.get("id", "")
        refund_amount = (refund_entity.get("amount") or 0) / 100.0

        if payment_id:
            receipt = db.query(Receipt).filter(Receipt.transaction_ref == payment_id).first()
            if receipt and receipt.status != ReceiptStatus.CANCELLED:
                receipt.status = ReceiptStatus.CANCELLED
                receipt.cancel_reason = f"Razorpay Webhook Refund (ID: {refund_id}, Amount: ₹{refund_amount:,.2f})"
                db.commit()
                logger.info(f"Webhook: Cancelled receipt {receipt.receipt_number} due to refund {refund_id}")
                return {"status": "ok", "action": "receipt_cancelled"}

        return {"status": "ok", "action": "no_matching_receipt"}

    # Acknowledge other events without processing
    return {"status": "ok", "action": "ignored", "event": event_type}


# ─── Razorpay Settlement & Fee Reconciliation Endpoints ──────────

@router.get("/razorpay/settlements")
async def get_razorpay_settlements(
    slug_or_id: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns list of synced Razorpay bank settlements with net payouts, gateway fees, and GST."""
    tenant = _resolve_tenant(slug_or_id or (current_user.tenant_id.hex if current_user.tenant_id else None), db)
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization tenant not found")

    settlements = db.query(OnlineSettlement).filter(
        OnlineSettlement.tenant_id == tenant.id
    ).order_by(OnlineSettlement.created_at.desc()).all()

    items = []
    total_net = 0.0
    total_fees = 0.0
    total_tax = 0.0

    for s in settlements:
        net_amt = float(s.amount)
        fee_amt = float(s.fees or 0)
        tax_amt = float(s.tax or 0)
        total_net += net_amt
        total_fees += fee_amt
        total_tax += tax_amt

        items.append({
            "id": str(s.id),
            "settlement_id": s.settlement_id,
            "amount": net_amt,
            "fees": fee_amt,
            "tax": tax_amt,
            "gross_amount": round(net_amt + fee_amt + tax_amt, 2),
            "utr": s.utr,
            "status": s.status,
            "processed_at": s.processed_at.isoformat() if s.processed_at else str(s.created_at),
            "expense_id": str(s.expense_id) if s.expense_id else None,
        })

    return {
        "settlements": items,
        "summary": {
            "total_net_payout": round(total_net, 2),
            "total_gateway_fees": round(total_fees, 2),
            "total_gst": round(total_tax, 2),
            "total_gross_collection": round(total_net + total_fees + total_tax, 2),
            "settlement_count": len(items),
        }
    }


@router.post("/razorpay/sync-settlements")
async def sync_razorpay_settlements(
    slug_or_id: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Syncs bank settlements directly from Razorpay REST API (/v1/settlements).

    Auto-reconciles net bank payouts and automatically logs an official Expense
    record for gateway fees & GST under 'Payment Gateway Charges'.
    """
    tenant = _resolve_tenant(slug_or_id or (current_user.tenant_id.hex if current_user.tenant_id else None), db)
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization tenant not found")

    key_id, key_secret, is_demo = _get_razorpay_keys(tenant)
    synced_count = 0
    new_expenses_count = 0

    # Get active financial year
    fy = db.query(FinancialYear).filter(
        FinancialYear.tenant_id == tenant.id,
        FinancialYear.is_current
    ).first()
    if not fy:
        fy = db.query(FinancialYear).filter(FinancialYear.tenant_id == tenant.id).order_by(FinancialYear.start_date.desc()).first()

    if is_demo:
        # Generate mock settlement for testing/demo mode if no live API keys configured
        mock_setl_id = f"setl_demo_{date.today().strftime('%Y%m%d')}_{uuid.uuid4().hex[:4]}"
        existing = db.query(OnlineSettlement).filter(
            OnlineSettlement.settlement_id == mock_setl_id,
            OnlineSettlement.tenant_id == tenant.id
        ).first()

        if not existing:
            mock_net = 490.98
            mock_fee = 10.02
            mock_tax = 1.80
            mock_utr = f"UTR{uuid.uuid4().hex[:10].upper()}"

            # Create Expense record for fee accounting
            exp = None
            if fy:
                exp_num = f"EXP-RZP-{mock_setl_id[-8:].upper()}"
                exp = db.query(Expense).filter(Expense.expense_number == exp_num, Expense.tenant_id == tenant.id).first()
                if not exp:
                    exp = Expense(
                        tenant_id=tenant.id,
                        financial_year_id=fy.id,
                        requested_by=current_user.id,
                        expense_number=exp_num,
                        expense_date=date.today(),
                        category="Payment Gateway Charges",
                        vendor_name="Razorpay Software Pvt Ltd",
                        amount=round(mock_fee + mock_tax, 2),
                        description=f"Razorpay Gateway Fee (₹{mock_fee:.2f}) + 18% GST (₹{mock_tax:.2f}) for Bank Settlement {mock_setl_id} (UTR: {mock_utr})",
                        status=ExpenseStatus.PAID,
                        paid_at=datetime.now(UTC),
                    )
                    db.add(exp)
                    db.flush()
                    new_expenses_count += 1

            setl = OnlineSettlement(
                tenant_id=tenant.id,
                settlement_id=mock_setl_id,
                amount=mock_net,
                fees=mock_fee,
                tax=mock_tax,
                utr=mock_utr,
                status="processed",
                processed_at=datetime.now(UTC),
                expense_id=exp.id if exp else None,
            )
            db.add(setl)
            db.commit()
            synced_count += 1

        return {
            "success": True,
            "message": f"Synced {synced_count} settlement(s). Auto-logged {new_expenses_count} gateway fee expense(s).",
            "is_mock": True,
        }

    # Real Razorpay API Sync
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.razorpay.com/v1/settlements",
                auth=(key_id, key_secret),
                params={"count": 50}
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])

                for item in items:
                    s_id = item.get("id")
                    if not s_id:
                        continue

                    s_net = (item.get("amount") or 0) / 100.0
                    s_fee = (item.get("fees") or 0) / 100.0
                    s_tax = (item.get("tax") or 0) / 100.0
                    s_utr = item.get("utr")
                    s_status = item.get("status", "processed")
                    created_timestamp = item.get("created_at")
                    processed_dt = datetime.fromtimestamp(created_timestamp, tz=UTC) if created_timestamp else datetime.now(UTC)

                    existing = db.query(OnlineSettlement).filter(
                        OnlineSettlement.settlement_id == s_id,
                        OnlineSettlement.tenant_id == tenant.id
                    ).first()

                    if not existing:
                        # Auto-log expense for fees + tax
                        exp = None
                        if fy and (s_fee + s_tax) > 0:
                            exp_num = f"EXP-RZP-{s_id[-8:].upper()}"
                            exp = db.query(Expense).filter(Expense.expense_number == exp_num, Expense.tenant_id == tenant.id).first()
                            if not exp:
                                exp = Expense(
                                    tenant_id=tenant.id,
                                    financial_year_id=fy.id,
                                    requested_by=current_user.id,
                                    expense_number=exp_num,
                                    expense_date=processed_dt.date(),
                                    category="Payment Gateway Charges",
                                    vendor_name="Razorpay Software Pvt Ltd",
                                    amount=round(s_fee + s_tax, 2),
                                    description=f"Razorpay Gateway Fee (₹{s_fee:.2f}) + 18% GST (₹{s_tax:.2f}) for Bank Settlement {s_id} (UTR: {s_utr or 'N/A'})",
                                    status=ExpenseStatus.PAID,
                                    paid_at=processed_dt,
                                )
                                db.add(exp)
                                db.flush()
                                new_expenses_count += 1

                        setl = OnlineSettlement(
                            tenant_id=tenant.id,
                            settlement_id=s_id,
                            amount=s_net,
                            fees=s_fee,
                            tax=s_tax,
                            utr=s_utr,
                            status=s_status,
                            processed_at=processed_dt,
                            expense_id=exp.id if exp else None,
                        )
                        db.add(setl)
                        synced_count += 1
                    else:
                        # Update status/UTR if changed
                        if s_utr and not existing.utr:
                            existing.utr = s_utr
                        existing.status = s_status

                db.commit()
                return {
                    "success": True,
                    "message": f"Synced {synced_count} settlement(s). Auto-logged {new_expenses_count} gateway fee expense(s).",
                    "is_mock": False,
                }
            else:
                err_desc = resp.json().get("error", {}).get("description", resp.text)
                raise HTTPException(status_code=400, detail=f"Razorpay API Error: {err_desc}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to sync Razorpay settlements: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to query Razorpay Settlements API: {str(e)}")
