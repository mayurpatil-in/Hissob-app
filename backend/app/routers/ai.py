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
from app.schemas.ai import (
    ParseReceiptInput, ParsedReceiptOutput,
    AIInsightsResponse, AIChatInput, AIChatResponse,
    AIAuditResponse, AIReportResponse,
)

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=AIChatResponse, summary="Context-Aware AI Financial Assistant Chat")
async def chat_with_ai(
    payload: AIChatInput,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = AIService(db)
    return service.chat_with_ai(payload.question, current_user.tenant_id)


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


@router.post("/audit", response_model=AIAuditResponse, summary="Run AI Financial Audit Scan")
async def run_audit(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Runs a comprehensive AI-driven audit scan checking for duplicates, anomalies, stale cash, and compliance issues."""
    service = AIService(db)
    return service.run_financial_audit(current_user.tenant_id)


@router.get("/executive-report", response_model=AIReportResponse, summary="Generate AI Executive Summary Report")
async def get_executive_report(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generates an LLM-powered executive financial summary report with analysis and recommendations."""
    service = AIService(db)
    return service.generate_executive_report(current_user.tenant_id)

