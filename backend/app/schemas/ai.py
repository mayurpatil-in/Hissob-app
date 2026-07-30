"""
Pydantic schemas for AI Assistant & Smart Financial Insights.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ParseReceiptInput(BaseModel):
    text: str = Field(..., description="Natural language input e.g. Received 5000 cash from Ramesh Patel for Ganesh festival")


class ParsedReceiptOutput(BaseModel):
    amount: Optional[float] = None
    donor_name: Optional[str] = None
    payment_mode: Optional[str] = "cash"
    purpose: Optional[str] = None
    confidence_score: float = 0.95
    parsed_fields: Dict[str, Any] = {}


class ParsedBillOutput(BaseModel):
    vendor_name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    expense_date: Optional[str] = None
    invoice_number: Optional[str] = None
    description: Optional[str] = None
    line_items: List[Dict[str, Any]] = []
    confidence_score: float = 0.95
    bill_url: Optional[str] = None
    is_llm_parsed: bool = True


class AIInsight(BaseModel):
    category: str  # collection, settlement, donor, budget
    title: str
    description: str
    action_suggestion: str
    impact_level: str  # high, medium, info


class AIInsightsResponse(BaseModel):
    generated_at: str
    tenant_name: Optional[str] = None
    insights: List[AIInsight]


class AIChatInput(BaseModel):
    question: str = Field(..., min_length=2, description="Natural language question e.g. How much did we collect last Ganesh Chaturthi?")


class AIChatResponse(BaseModel):
    question: str
    answer: str
    suggested_followups: List[str] = []
    generated_at: str
    is_llm_powered: bool = True
    ai_provider: Optional[str] = "Gemini 2.0 Flash"


class AuditFinding(BaseModel):
    category: str  # duplicate_upi, large_receipt, stale_cash, over_budget, vendor_concentration, inactive_vip, missing_bill, round_amount
    severity: str  # high, medium, info
    title: str
    description: str
    suggestion: str
    affected_records: List[str] = []  # receipt numbers / expense numbers / donor names


class AIAuditResponse(BaseModel):
    generated_at: str
    tenant_name: Optional[str] = None
    total_findings: int = 0
    high_count: int = 0
    medium_count: int = 0
    info_count: int = 0
    health_score: int = 100
    findings: List[AuditFinding] = []


class AIReportResponse(BaseModel):
    generated_at: str
    tenant_name: Optional[str] = None
    report_text: str
    ai_provider: Optional[str] = "Gemini 2.0 Flash"
    is_llm_powered: bool = True

