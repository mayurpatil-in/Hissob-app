"""
AI Router — AI Assistant & Smart Financial Insights APIs.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.services.ai import AIService
from app.schemas.ai import ParseReceiptInput, ParsedReceiptOutput, AIInsightsResponse

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/parse-receipt", response_model=ParsedReceiptOutput, summary="AI Voice / Text Receipt Parser")
async def parse_receipt(
    payload: ParseReceiptInput,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = AIService(db)
    return service.parse_natural_language_receipt(payload.text)


@router.get("/insights", response_model=AIInsightsResponse, summary="Get AI Smart Financial Insights")
async def get_insights(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = AIService(db)
    return service.generate_smart_insights(current_user.tenant_id)
