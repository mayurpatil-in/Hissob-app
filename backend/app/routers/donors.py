"""
Donors & Areas Routers — Manage donors and collection areas.
"""
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.donor import Area
from app.models.donor import Donor
from app.models.user import User
from app.permissions.rbac import require
from app.repositories.donor import AreaRepository
from app.repositories.donor import DonorRepository
from app.schemas.donor import AreaCreate
from app.schemas.donor import AreaResponse
from app.schemas.donor import DonorCreate
from app.schemas.donor import DonorResponse
from app.schemas.donor import DonorUpdate

router = APIRouter(prefix="/donors", tags=["Donors"])
areas_router = APIRouter(prefix="/areas", tags=["Areas"])


# ── Area Endpoints ──
@areas_router.get("", response_model=list[AreaResponse], summary="List Areas")
async def list_areas(
    current_user: User = Depends(require("areas", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    repo = AreaRepository(db)
    return repo.get_active_by_tenant(current_user.tenant_id)


@areas_router.post("", response_model=AreaResponse, status_code=status.HTTP_201_CREATED, summary="Create Area")
async def create_area(
    payload: AreaCreate,
    current_user: User = Depends(require("areas", "create")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    repo = AreaRepository(db)
    area = Area(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        code=payload.code,
        description=payload.description,
    )
    return repo.create(area)


from app.auth.deps import get_current_active_user


# ── Donor Endpoints ──
@router.get("", response_model=list[DonorResponse], summary="List & Search Donors")
async def list_donors(
    q: str | None = Query(None, description="Search by name, phone or donor number"),
    area_id: UUID | None = Query(None, description="Filter by area"),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    repo = DonorRepository(db)
    donors = repo.search_donors(current_user.tenant_id, query=q, area_id=area_id, skip=skip, limit=limit)

    # Active Financial Year
    from sqlalchemy import func

    from app.models.financial_year import FinancialYear
    from app.models.receipt import Receipt
    from app.models.receipt import ReceiptStatus

    active_fy = db.query(FinancialYear).filter(
        FinancialYear.tenant_id == current_user.tenant_id,
        FinancialYear.is_current
    ).first()

    fy_donations_map = {}
    if active_fy:
        fy_sums = (
            db.query(Receipt.donor_id, func.sum(Receipt.amount))
            .filter(
                Receipt.tenant_id == current_user.tenant_id,
                Receipt.financial_year_id == active_fy.id,
                Receipt.status != ReceiptStatus.CANCELLED,
            )
            .group_by(Receipt.donor_id)
            .all()
        )
        fy_donations_map = {donor_id: int(total or 0) for donor_id, total in fy_sums}

    lifetime_sums = (
        db.query(Receipt.donor_id, func.sum(Receipt.amount))
        .filter(
            Receipt.tenant_id == current_user.tenant_id,
            Receipt.status != ReceiptStatus.CANCELLED,
        )
        .group_by(Receipt.donor_id)
        .all()
    )
    lifetime_map = {donor_id: int(total or 0) for donor_id, total in lifetime_sums}

    for d in donors:
        if d.id in lifetime_map:
            d.total_donations = lifetime_map[d.id]
        d.this_year_donations = fy_donations_map.get(d.id, 0)

    return donors


def normalize_phone(phone: str | None) -> str | None:
    """Cleans phone numbers into a 10-digit normalized string for comparison."""
    if not phone:
        return None
    cleaned = ''.join(c for c in phone if c.isdigit())
    if len(cleaned) == 12 and cleaned.startswith("91"):
        cleaned = cleaned[2:]
    elif len(cleaned) == 11 and cleaned.startswith("0"):
        cleaned = cleaned[1:]
    return cleaned if len(cleaned) >= 10 else None


from fastapi import APIRouter
from fastapi import BackgroundTasks
from fastapi import Depends
from fastapi import Query
from fastapi import status

from app.models.tenant import Tenant


@router.post("", response_model=DonorResponse, status_code=status.HTTP_201_CREATED, summary="Create Donor")
async def create_donor(
    payload: DonorCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require("donors", "create")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    # Validate duplicate phone number in tenant
    if payload.phone and payload.phone.strip():
        norm_phone = normalize_phone(payload.phone)
        if norm_phone:
            existing_donors = db.query(Donor).filter(
                Donor.tenant_id == current_user.tenant_id,
                Donor.is_active,
                Donor.phone.isnot(None),
            ).all()
            for existing in existing_donors:
                if existing.phone and normalize_phone(existing.phone) == norm_phone:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"A donor with phone number '{payload.phone}' already exists: {existing.donor_number} ({existing.full_name})"
                    )

    # Validate duplicate email address in tenant
    if payload.email and payload.email.strip():
        clean_email = payload.email.strip().lower()
        existing_email_donor = db.query(Donor).filter(
            Donor.tenant_id == current_user.tenant_id,
            Donor.is_active,
            Donor.email.isnot(None),
        ).all()
        for existing in existing_email_donor:
            if existing.email and existing.email.strip().lower() == clean_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A donor with email address '{payload.email}' already exists: {existing.donor_number} ({existing.full_name})"
                )

    repo = DonorRepository(db)
    donor_number = payload.donor_number or repo.generate_donor_number(current_user.tenant_id)

    donor = Donor(
        tenant_id=current_user.tenant_id,
        area_id=payload.area_id,
        donor_number=donor_number,
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        city=payload.city,
        pincode=payload.pincode,
        pan_number=payload.pan_number,
        is_80g_eligible=payload.is_80g_eligible,
        is_vip=payload.is_vip,
        notes=payload.notes,
    )
    created = repo.create(donor)

    # Dispatch Welcome Email if donor email is provided and enabled in tenant settings
    if created.email and "@" in created.email:
        tenant = db.get(Tenant, current_user.tenant_id)
        if tenant and getattr(tenant, "enable_welcome_email", True):
            from app.services.email_service import send_donor_welcome_email
            background_tasks.add_task(
                send_donor_welcome_email,
                to_email=created.email,
                donor_name=created.full_name,
                donor_number=created.donor_number,
                org_name=tenant.name,
                org_city=tenant.city,
                org_logo_url=tenant.logo_url,
            )

    return created


@router.get("/{donor_id}", response_model=DonorResponse, summary="Get Donor Details")
async def get_donor(
    donor_id: UUID,
    current_user: User = Depends(require("donors", "view")),
    db: Session = Depends(get_db),
):
    repo = DonorRepository(db)
    donor = repo.get(donor_id)
    if not donor or (donor.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Donor not found")
    return donor


@router.get("/{donor_id}/summary", summary="Get Donor Comprehensive History & Metrics")
async def get_donor_summary(
    donor_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):

    from app.models.receipt import PaymentMode
    from app.models.receipt import Receipt
    from app.models.receipt import ReceiptStatus

    repo = DonorRepository(db)
    donor = repo.get(donor_id)
    if not donor or (donor.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Donor not found")

    # Query receipts for this donor
    receipts_raw = (
        db.query(Receipt)
        .filter(
            Receipt.tenant_id == current_user.tenant_id,
            Receipt.donor_id == donor_id,
            Receipt.status != ReceiptStatus.CANCELLED,
        )
        .order_by(Receipt.receipt_date.desc())
        .all()
    )

    total_amount = sum(r.amount for r in receipts_raw)
    receipt_count = len(receipts_raw)
    avg_donation = (total_amount / receipt_count) if receipt_count > 0 else 0.0
    cash_total = sum(r.amount for r in receipts_raw if r.payment_mode == PaymentMode.CASH)
    digital_total = total_amount - cash_total

    first_date = str(receipts_raw[-1].receipt_date) if receipts_raw else None
    last_date = str(receipts_raw[0].receipt_date) if receipts_raw else None

    collector_ids = {r.collector_id for r in receipts_raw if r.collector_id}
    user_map = {u.id: u.full_name for u in db.query(User.id, User.full_name).filter(User.id.in_(collector_ids)).all()} if collector_ids else {}
    receipt_list = []
    for r in receipts_raw:
        collector_name = user_map.get(r.collector_id, "Collector")
        receipt_list.append({
            "id": str(r.id),
            "receipt_number": r.receipt_number,
            "receipt_date": str(r.receipt_date),
            "amount": float(r.amount),
            "payment_mode": r.payment_mode.value if hasattr(r.payment_mode, "value") else str(r.payment_mode),
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "collector_name": collector_name,
            "purpose": r.purpose or "Festival Donation",
            "notes": r.notes,
        })

    return {
        "donor": {
            "id": str(donor.id),
            "donor_number": donor.donor_number,
            "full_name": donor.full_name,
            "phone": donor.phone,
            "email": donor.email,
            "address": donor.address,
            "city": donor.city,
            "pan_number": donor.pan_number,
            "is_vip": donor.is_vip,
            "is_80g_eligible": donor.is_80g_eligible,
        },
        "metrics": {
            "total_amount": float(total_amount),
            "receipt_count": receipt_count,
            "average_donation": float(avg_donation),
            "cash_total": float(cash_total),
            "digital_total": float(digital_total),
            "first_donation_date": first_date,
            "last_donation_date": last_date,
        },
        "receipts": receipt_list,
    }


@router.put("/{donor_id}", response_model=DonorResponse, summary="Update Donor")
async def update_donor(
    donor_id: UUID,
    payload: DonorUpdate,
    current_user: User = Depends(require("donors", "update")),
    db: Session = Depends(get_db),
):
    repo = DonorRepository(db)
    donor = repo.get(donor_id)
    if not donor or (donor.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Donor not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "phone" in update_data and update_data["phone"] and update_data["phone"].strip():
        norm_phone = normalize_phone(update_data["phone"])
        if norm_phone:
            existing_donors = db.query(Donor).filter(
                Donor.tenant_id == current_user.tenant_id,
                Donor.id != donor_id,
                Donor.is_active,
                Donor.phone.isnot(None),
            ).all()
            for existing in existing_donors:
                if existing.phone and normalize_phone(existing.phone) == norm_phone:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"A donor with phone number '{update_data['phone']}' already exists: {existing.donor_number} ({existing.full_name})"
                    )

    if "email" in update_data and update_data["email"] and update_data["email"].strip():
        clean_email = update_data["email"].strip().lower()
        existing_email_donors = db.query(Donor).filter(
            Donor.tenant_id == current_user.tenant_id,
            Donor.id != donor_id,
            Donor.is_active,
            Donor.email.isnot(None),
        ).all()
        for existing in existing_email_donors:
            if existing.email and existing.email.strip().lower() == clean_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A donor with email address '{update_data['email']}' already exists: {existing.donor_number} ({existing.full_name})"
                )

    return repo.update(donor, update_data)


@router.delete("/{donor_id}", status_code=204, summary="Delete Donor")
async def delete_donor(
    donor_id: UUID,
    current_user: User = Depends(require("donors", "delete")),
    db: Session = Depends(get_db),
):
    repo = DonorRepository(db)
    donor = repo.get(donor_id)
    if not donor or (donor.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Donor not found")

    donor.is_active = False
    db.commit()
    return None
