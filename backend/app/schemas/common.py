"""
Common response schemas.
"""
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class SuccessResponse(BaseModel):
    success: bool = True
    message: str


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    errors: list[ErrorDetail] | None = None
