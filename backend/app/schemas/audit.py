"""
Pydantic schemas for Audit Log querying.
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: UUID
    tenant_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    action: str
    module: str
    record_id: Optional[str] = None
    record_label: Optional[str] = None
    ip_address: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
