"""
Pydantic schemas for Audit Log querying.
"""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: UUID
    tenant_id: UUID | None = None
    user_id: UUID | None = None
    user_email: str | None = None
    action: str
    module: str
    record_id: str | None = None
    record_label: str | None = None
    ip_address: str | None = None
    old_values: dict[str, Any] | None = None
    new_values: dict[str, Any] | None = None
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityFeedItem(BaseModel):
    id: UUID
    user_name: str
    user_email: str
    user_avatar: str | None = None
    story: str
    action: str
    module: str
    created_at: datetime
    time_ago: str

    model_config = {"from_attributes": True}
