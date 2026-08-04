"""
Pydantic schemas for AI Assistant & Smart Financial Insights.
"""
from typing import Any

from pydantic import BaseModel
from pydantic import Field


class ParseReceiptInput(BaseModel):
    text: str = Field(..., description="Natural language input e.g. Received 5000 cash from Ramesh Patel for Ganesh festival")


class ParsedReceiptOutput(BaseModel):
    amount: float | None = None
    donor_name: str | None = None
    payment_mode: str | None = "cash"
    purpose: str | None = None
    confidence_score: float = 0.95
    parsed_fields: dict[str, Any] = {}


class ParsedBillOutput(BaseModel):
    vendor_name: str | None = None
    amount: float | None = None
    category: str | None = None
    expense_date: str | None = None
    invoice_number: str | None = None
    description: str | None = None
    line_items: list[dict[str, Any]] = []
    confidence_score: float = 0.95
    bill_url: str | None = None
    is_llm_parsed: bool = True


class AIInsight(BaseModel):
    category: str  # collection, settlement, donor, budget
    title: str
    description: str
    action_suggestion: str
    impact_level: str  # high, medium, info


class AIInsightsResponse(BaseModel):
    generated_at: str
    tenant_name: str | None = None
    insights: list[AIInsight]


class AIChatMessageItem(BaseModel):
    role: str = Field(..., description="Role of the sender: 'user' or 'assistant'")
    content: str = Field(..., description="Content of the message")


class AIChatInput(BaseModel):
    question: str = Field(..., min_length=2, description="Natural language question e.g. How much did we collect last Ganesh Chaturthi?")
    history: list[AIChatMessageItem] | None = Field(default=[], description="Previous conversation turns for context memory")


class AIChatResponse(BaseModel):
    question: str
    answer: str
    suggested_followups: list[str] = []
    generated_at: str
    is_llm_powered: bool = True
    ai_provider: str | None = "Gemini 2.0 Flash"


class AuditFinding(BaseModel):
    category: str  # duplicate_upi, large_receipt, stale_cash, over_budget, vendor_concentration, inactive_vip, missing_bill, round_amount
    severity: str  # high, medium, info
    title: str
    description: str
    suggestion: str
    affected_records: list[str] = []  # receipt numbers / expense numbers / donor names


class AIAuditResponse(BaseModel):
    generated_at: str
    tenant_name: str | None = None
    total_findings: int = 0
    high_count: int = 0
    medium_count: int = 0
    info_count: int = 0
    health_score: int = 100
    findings: list[AuditFinding] = []


class AIReportResponse(BaseModel):
    generated_at: str
    tenant_name: str | None = None
    report_text: str
    ai_provider: str | None = "Gemini 2.0 Flash"
    is_llm_powered: bool = True

