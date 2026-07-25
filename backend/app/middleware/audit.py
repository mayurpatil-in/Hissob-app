"""
Audit middleware — logs every mutating request automatically.
"""
import time
from datetime import datetime, timezone
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import json


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Lightweight audit middleware — stores context for use in services.
    Full audit logging happens at the service layer for data diff capture.
    """

    MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
    SKIP_PATHS = {"/api/v1/auth/login", "/api/v1/auth/refresh", "/health", "/docs", "/openapi.json"}

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()

        # Inject request context for use in service layer
        request.state.ip_address = request.client.host if request.client else "unknown"
        request.state.user_agent = request.headers.get("user-agent", "")
        request.state.request_start = start_time

        response = await call_next(request)

        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))

        return response


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Resolves tenant_id from the authenticated user's JWT and stores in request.state.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.tenant_id = None  # Will be set by auth deps
        response = await call_next(request)
        return response
