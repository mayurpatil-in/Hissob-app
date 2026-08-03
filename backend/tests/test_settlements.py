"""
Integration test suite for Cash Settlements API & Row-level Locking.
"""
import pytest
import uuid
from app.models.donor import Donor
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
from app.models.finance import CashSettlement, SettlementStatus


def test_submit_cash_settlement_workflow(client, auth_headers, test_tenant, test_fy, test_user, db):
    # 1. Create donor & cash receipts
    donor = Donor(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        full_name="Suresh Patil",
        phone="9123456789",
        is_active=True,
    )
    db.add(donor)
    db.flush()

    r1 = Receipt(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        financial_year_id=test_fy.id,
        donor_id=donor.id,
        collector_id=test_user.id,
        receipt_number="RC-SET-001",
        receipt_date="2025-09-02",
        amount=2500.0,
        payment_mode=PaymentMode.CASH,
        status=ReceiptStatus.ISSUED,
    )
    r2 = Receipt(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        financial_year_id=test_fy.id,
        donor_id=donor.id,
        collector_id=test_user.id,
        receipt_number="RC-SET-002",
        receipt_date="2025-09-02",
        amount=1500.0,
        payment_mode=PaymentMode.CASH,
        status=ReceiptStatus.ISSUED,
    )
    db.add(r1)
    db.add(r2)
    db.flush()

    # 2. Submit settlement for r1 and r2
    payload = {
        "financial_year_id": str(test_fy.id),
        "receipt_ids": [str(r1.id), str(r2.id)],
        "notes": "EOD Cash Handover to Treasurer",
    }
    response = client.post("/api/v1/settlements", headers=auth_headers, json=payload)
    assert response.status_code == 201
    settlement_data = response.json()
    assert settlement_data["total_amount"] == 4000.0
    assert settlement_data["receipt_count"] == 2
    assert settlement_data["status"] == SettlementStatus.SUBMITTED

    # 3. Verify receipt status changed to PENDING_SETTLEMENT
    db.refresh(r1)
    db.refresh(r2)
    assert r1.status == ReceiptStatus.PENDING_SETTLEMENT
    assert r2.status == ReceiptStatus.PENDING_SETTLEMENT

    # 4. Attempting to resubmit the exact same receipts must fail (double settlement prevention)
    resubmit_resp = client.post("/api/v1/settlements", headers=auth_headers, json=payload)
    assert resubmit_resp.status_code == 400
    assert "invalid or already settled" in resubmit_resp.json()["detail"]
