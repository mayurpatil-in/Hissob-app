"""
Integration test suite for Receipts & Donor APIs.
"""
import pytest
import uuid
from app.models.donor import Donor
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode


def test_create_and_list_receipts(client, auth_headers, test_tenant, test_fy, test_user, db):
    # 1. Create a donor
    donor = Donor(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        donor_number="DNR-TEST-0001",
        full_name="Rajesh Sharma",
        phone="9876543210",
        city="Kolhapur",
        is_active=True,
    )
    db.add(donor)
    db.flush()

    # 2. Create a receipt via POST API
    payload = {
        "financial_year_id": str(test_fy.id),
        "donor_id": str(donor.id),
        "amount": 5000.0,
        "payment_mode": "cash",
        "purpose": "Ganesh Utsav Seva",
        "receipt_date": "2025-09-01",
    }
    response = client.post("/api/v1/receipts", headers=auth_headers, json=payload)
    assert response.status_code == 201
    receipt_data = response.json()
    assert receipt_data["amount"] == 5000.0
    assert "receipt_number" in receipt_data

    # 3. List receipts
    list_resp = client.get("/api/v1/receipts", headers=auth_headers)
    assert list_resp.status_code == 200
    receipts_list = list_resp.json()
    assert len(receipts_list) >= 1
    assert any(r["id"] == receipt_data["id"] for r in receipts_list)


def test_public_donor_lookup(client, test_tenant, db):
    donor = Donor(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        donor_number="DNR-PUB-0002",
        full_name="Anand Kumar",
        phone="9988776655",
        city="Mumbai",
        is_active=True,
    )
    db.add(donor)
    db.flush()

    # Public lookup by phone
    resp = client.get(f"/api/v1/receipts/public-donor-lookup?phone=9988776655&slug_or_id={test_tenant.slug}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["exists"] is True
    assert data["full_name"] == "Anand Kumar"


def test_soft_delete_isolation(db, test_tenant, test_fy, test_user):
    donor = Donor(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        full_name="Deleted Donor",
        phone="9000000000",
        is_deleted=True,  # Soft deleted
    )
    receipt = Receipt(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        financial_year_id=test_fy.id,
        donor_id=donor.id,
        collector_id=test_user.id,
        receipt_number="RC-TEST-DEL-01",
        receipt_date="2025-09-01",
        amount=1000.0,
        payment_mode=PaymentMode.CASH,
        is_deleted=True,  # Soft deleted
    )
    db.add(donor)
    db.add(receipt)
    db.flush()

    from app.repositories.receipt import ReceiptRepository
    from app.repositories.donor import DonorRepository

    r_repo = ReceiptRepository(db)
    d_repo = DonorRepository(db)

    # Repository queries must exclude soft-deleted records
    tenant_receipts = r_repo.get_by_tenant(test_tenant.id)
    assert not any(r.id == receipt.id for r in tenant_receipts)

    donors_found = d_repo.search_donors(test_tenant.id, query="Deleted")
    assert not any(d.id == donor.id for d in donors_found)
