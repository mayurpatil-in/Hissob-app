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
