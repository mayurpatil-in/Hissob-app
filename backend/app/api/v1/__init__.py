"""
API v1 router aggregator — includes Phase 1, Phase 2, and Phase 3 module routers.
"""
from fastapi import APIRouter
from app.routers.auth import router as auth_router
from app.routers.organizations import router as organizations_router
from app.routers.financial_years import router as financial_years_router
from app.routers.festivals import router as festivals_router
from app.routers.donors import router as donors_router, areas_router
from app.routers.receipts import router as receipts_router
from app.routers.settlements import router as settlements_router
from app.routers.expenses import router as expenses_router
from app.routers.reports import router as reports_router
from app.routers.audit import router as audit_router
from app.routers.super_admin import router as super_admin_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(organizations_router)
router.include_router(financial_years_router)
router.include_router(festivals_router)
router.include_router(donors_router)
router.include_router(areas_router)
router.include_router(receipts_router)
router.include_router(settlements_router)
router.include_router(expenses_router)
router.include_router(reports_router)
router.include_router(audit_router)
router.include_router(super_admin_router)
