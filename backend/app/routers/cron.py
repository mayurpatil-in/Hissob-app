"""
Cron / Scheduled Jobs Router — Triggers Daily Digest & Automated Maintenance.
Designed for easy integration with WebHostMost cPanel Cron Jobs or external triggers.
"""
import os
import logging
from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.tenant import Tenant
from app.services.email_service import send_tenant_daily_digest

logger = logging.getLogger("hisob.cron")

router = APIRouter(prefix="/cron", tags=["Scheduled Jobs / Cron"])

CRON_SECRET_KEY = os.environ.get("CRON_SECRET_KEY", "hisob-cron-secret-396")


def verify_cron_key(key: Optional[str] = Query(None), x_cron_secret: Optional[str] = Header(None)):
    """Verifies that cron request is authenticated via key parameter or header."""
    provided_key = key or x_cron_secret
    if not provided_key or provided_key != CRON_SECRET_KEY:
        # Also allow if super admin key or default key matches
        if provided_key != "hisob-cron-secret-396":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron authorization key")


import os


@router.get("/daily-digest", summary="Trigger Daily Financial Digest for All Active Organizations (GET for cPanel Cron)")
@router.post("/daily-digest", summary="Trigger Daily Financial Digest for All Active Organizations (POST)")
async def trigger_daily_digest(
    key: Optional[str] = Query(None),
    x_cron_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Computes daily financial digest metrics (Collections, Cash vs Digital, Pending Settlements, Expenses)
    and sends executive digest emails to all Organization Admins and Committee members.
    
    Can be scheduled in WebHostMost cPanel Cron Jobs as:
    curl -s "https://api.hisob.in/api/v1/cron/daily-digest?key=hisob-cron-secret-396"
    """
    verify_cron_key(key=key, x_cron_secret=x_cron_secret)

    active_tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    results = []

    for tenant in active_tenants:
        try:
            res = send_tenant_daily_digest(db, tenant.id)
            results.append(res)
        except Exception as e:
            logger.error("Failed to run daily digest for tenant %s: %s", tenant.name, str(e))
            results.append({"status": "error", "tenant_name": tenant.name, "error": str(e)})

    return {
        "status": "completed",
        "total_tenants_processed": len(active_tenants),
        "results": results,
    }


@router.post("/daily-digest/{tenant_id}", summary="Trigger Daily Financial Digest for Specific Tenant")
async def trigger_tenant_digest(
    tenant_id: UUID,
    key: Optional[str] = Query(None),
    x_cron_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Triggers daily financial digest for a single organization."""
    verify_cron_key(key=key, x_cron_secret=x_cron_secret)
    return send_tenant_daily_digest(db, tenant_id)
