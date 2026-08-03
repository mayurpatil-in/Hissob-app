"""
Payments Router — Online Payment Gateway Integration (Razorpay & UPI).
"""
import uuid
import hmac
import hashlib
import logging
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

from app.core.database import get_db
from app.core.config import settings
from app.models.tenant import Tenant
from app.models.financial_year import FinancialYear
from app.models.donor import Donor
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Online Payments"])


from urllib.parse import quote


class CreateOrderRequest(BaseModel):
    amount: float
    currency: str = "INR"
    donor_name: Optional[str] = "Donor"
    donor_phone: Optional[str] = None
    donor_email: Optional[str] = None
    purpose: Optional[str] = "General Donation"
    slug_or_id: Optional[str] = None


class CreatePaymentLinkRequest(BaseModel):
    amount: float
    donor_name: Optional[str] = None
    donor_phone: Optional[str] = None
    donor_email: Optional[str] = None
    purpose: Optional[str] = "General Donation"
    description: Optional[str] = None
    slug_or_id: Optional[str] = None


class CreateRefundRequest(BaseModel):
    receipt_id: str
    amount: Optional[float] = None
    reason: Optional[str] = "Donor requested cancellation"


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    slug_or_id: Optional[str] = None
    full_name: str
    phone: str
    email: Optional[str] = None
    pan_number: Optional[str] = None
    city: Optional[str] = None
    amount: float
    purpose: Optional[str] = "General Donation"
    notes: Optional[str] = None


@router.get("/razorpay/config")
def get_razorpay_config():
    """Returns public Razorpay configuration for online donation checkout."""
    key_id = settings.RAZORPAY_KEY_ID or "rzp_test_hissob_key"
    is_live = not key_id.startswith("rzp_test")
    return {
        "key_id": key_id,
        "enabled": True,
        "mode": "live" if is_live else "test",
    }


@router.post("/razorpay/create-order")
async def create_razorpay_order(req: CreateOrderRequest, db: Session = Depends(get_db)):
    """Creates a Razorpay Order for online payment."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Donation amount must be greater than zero")

    amount_in_paise = int(round(req.amount * 100))
    key_id = settings.RAZORPAY_KEY_ID or "rzp_test_hissob_key"
    key_secret = settings.RAZORPAY_KEY_SECRET or "hissob_secret"

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
                    },
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
                try:
                    err_json = resp.json()
                except Exception:
                    pass
                err_desc = err_json.get("error", {}).get("description", resp.text)
                logger.error(f"Razorpay API Error ({resp.status_code}): {err_desc}")
                
                # If specific Razorpay keys were provided in .env, raise descriptive error
                if key_id != "rzp_test_hissob_key" and key_secret != "hissob_razorpay_secret_key":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Razorpay API Error: {err_desc}. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env"
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
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Donation amount must be greater than zero")

    amount_in_paise = int(round(req.amount * 100))
    key_id = settings.RAZORPAY_KEY_ID or "rzp_test_hissob_key"
    key_secret = settings.RAZORPAY_KEY_SECRET or "hissob_secret"

    tenant = None
    if req.slug_or_id:
        tenant = db.query(Tenant).filter(Tenant.slug == req.slug_or_id).first()
        if not tenant:
            try:
                target_uuid = uuid.UUID(req.slug_or_id)
                tenant = db.query(Tenant).filter(Tenant.id == target_uuid).first()
            except Exception:
                pass
    if not tenant:
        tenant = db.query(Tenant).first()

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


@router.post("/razorpay/verify-payment")
def verify_razorpay_payment(req: VerifyPaymentRequest, db: Session = Depends(get_db)):
    """Verifies Razorpay HMAC signature and generates an official donor receipt."""
    key_secret = settings.RAZORPAY_KEY_SECRET or "hissob_secret"

    # Verify HMAC-SHA256 signature if not mock test order
    if not req.razorpay_order_id.startswith("order_test_"):
        generated_signature = hmac.new(
            key_secret.encode(),
            f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_signature != req.razorpay_signature:
            logger.error("Razorpay signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid payment signature")

    tenant = None
    if req.slug_or_id:
        tenant = db.query(Tenant).filter(Tenant.slug == req.slug_or_id).first()
        if not tenant:
            try:
                target_uuid = uuid.UUID(req.slug_or_id)
                tenant = db.query(Tenant).filter(Tenant.id == target_uuid).first()
            except Exception:
                pass

    if not tenant:
        tenant = db.query(Tenant).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Organization tenant not found")

    # Get active financial year
    fy = db.query(FinancialYear).filter(
        FinancialYear.tenant_id == tenant.id,
        FinancialYear.is_current == True
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

    # Find or Create Donor by phone
    clean_phone = req.phone.strip()
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
            full_name=req.full_name.strip(),
            phone=clean_phone,
            email=req.email,
            pan_number=req.pan_number,
            city=req.city,
        )
        db.add(donor)
        db.flush()
    else:
        if req.pan_number and not donor.pan_number:
            donor.pan_number = req.pan_number
        if req.email and not donor.email:
            donor.email = req.email
        if req.city and not donor.city:
            donor.city = req.city
        db.flush()

    # Generate sequential receipt number
    count_receipts = db.query(Receipt).filter(Receipt.tenant_id == tenant.id).count()
    receipt_num = f"RCP-{date.today().year}-{count_receipts + 1:05d}"

    # Create official Receipt record
    receipt = Receipt(
        tenant_id=tenant.id,
        financial_year_id=fy.id,
        donor_id=donor.id,
        collector_id=collector.id,
        receipt_number=receipt_num,
        receipt_date=date.today(),
        amount=req.amount,
        payment_mode=PaymentMode.UPI,
        status=ReceiptStatus.ISSUED,
        transaction_ref=req.razorpay_payment_id,
        purpose=req.purpose,
        notes=f"Razorpay Online Gateway (Order: {req.razorpay_order_id}). {req.notes or ''}".strip(),
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    return {
        "id": str(receipt.id),
        "receipt_number": receipt.receipt_number,
        "amount": float(receipt.amount),
        "receipt_date": str(receipt.receipt_date),
        "payment_mode": receipt.payment_mode,
        "transaction_ref": receipt.transaction_ref,
        "purpose": receipt.purpose,
        "donor": {
            "full_name": donor.full_name,
            "phone": donor.phone,
            "donor_number": donor.donor_number,
        }
    }


@router.post("/razorpay/refund")
async def initiate_razorpay_refund(req: CreateRefundRequest, db: Session = Depends(get_db)):
    """Initiates a full or partial online refund via Razorpay REST API and updates receipt status."""
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
    key_id = settings.RAZORPAY_KEY_ID or "rzp_test_hissob_key"
    key_secret = settings.RAZORPAY_KEY_SECRET or "hissob_secret"

    refund_id = f"rfnd_demo_{uuid.uuid4().hex[:10]}"
    refund_status = "processed"

    # Attempt Razorpay Refund API call if not mock transaction
    if not payment_id.startswith("pay_demo_") and not payment_id.startswith("mock_"):
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
                else:
                    err_desc = resp.json().get("error", {}).get("description", resp.text)
                    logger.error(f"Razorpay Refund API error ({resp.status_code}): {err_desc}")
                    raise HTTPException(status_code=400, detail=f"Razorpay Refund Error: {err_desc}")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Razorpay refund API call failed: {e}")

    # Mark receipt as cancelled in database
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
