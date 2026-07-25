"""
Common response schemas.
"""
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, List

T = TypeVar("T")


class SuccessResponse(BaseModel):
    success: bool = True
    message: str


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    errors: Optional[List[ErrorDetail]] = None
