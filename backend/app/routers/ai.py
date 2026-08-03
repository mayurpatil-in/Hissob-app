import os
import uuid
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.services.ai import AIService
from app.schemas.ai import (
    ParseReceiptInput, ParsedReceiptOutput,
    AIInsightsResponse, AIChatInput, AIChatResponse,
    AIAuditResponse, AIReportResponse, ParsedBillOutput,
)

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=AIChatResponse, summary="Context-Aware AI Financial Assistant Chat")
async def chat_with_ai(
    payload: AIChatInput,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = AIService(db)
    history_dicts = [h.model_dump() for h in payload.history] if payload.history else None
    return service.chat_with_ai(payload.question, current_user.tenant_id, history=history_dicts)


@router.post("/parse-receipt", response_model=ParsedReceiptOutput, summary="AI Voice / Text Receipt Parser")
async def parse_receipt(
    payload: ParseReceiptInput,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = AIService(db)
    return service.parse_natural_language_receipt(payload.text)


@router.post("/parse-bill-ocr", response_model=ParsedBillOutput, summary="AI Vision OCR Vendor Bill Auto-Scanner")
async def parse_bill_ocr(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Accepts an uploaded vendor bill photo/PDF, runs Gemini Vision AI OCR extraction,
    saves file to uploads directory, and returns structured vendor invoice details.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filename = f"bill_ocr_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(contents)

    bill_url = f"/uploads/{filename}"
    mime_type = file.content_type or ("image/png" if ext == ".png" else "image/jpeg")

    service = AIService(db)
    return service.parse_vendor_bill_ocr(contents, mime_type, bill_url=bill_url, tenant_id=current_user.tenant_id)


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


