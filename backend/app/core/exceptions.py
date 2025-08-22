from fastapi import HTTPException, status
from typing import Any, Dict, Optional

class BaseAPIException(HTTPException):
    """Base exception for API errors"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code

class BadRequestException(BaseAPIException):
    """400 Bad Request"""
    def __init__(self, detail: str, error_code: str = "BAD_REQUEST"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code=error_code
        )

class UnauthorizedException(BaseAPIException):
    """401 Unauthorized"""
    def __init__(self, detail: str = "Unauthorized", error_code: str = "UNAUTHORIZED"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code=error_code,
            headers={"WWW-Authenticate": "Bearer"}
        )

class ForbiddenException(BaseAPIException):
    """403 Forbidden"""
    def __init__(self, detail: str = "Forbidden", error_code: str = "FORBIDDEN"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code=error_code
        )

class NotFoundException(BaseAPIException):
    """404 Not Found"""
    def __init__(self, detail: str = "Not found", error_code: str = "NOT_FOUND"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code=error_code
        )

class ConflictException(BaseAPIException):
    """409 Conflict"""
    def __init__(self, detail: str, error_code: str = "CONFLICT"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code=error_code
        )

class ValidationException(BaseAPIException):
    """422 Unprocessable Entity"""
    def __init__(self, detail: str, error_code: str = "VALIDATION_ERROR"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code=error_code
        )

class RateLimitException(BaseAPIException):
    """429 Too Many Requests"""
    def __init__(self, detail: str = "Rate limit exceeded", error_code: str = "RATE_LIMIT"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_code=error_code
        )

class InternalServerException(BaseAPIException):
    """500 Internal Server Error"""
    def __init__(self, detail: str = "Internal server error", error_code: str = "INTERNAL_ERROR"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code=error_code
        )

# Business Logic Exceptions
class RoomNotAvailableException(ConflictException):
    """Room is not available for booking"""
    def __init__(self, room_number: str):
        super().__init__(
            detail=f"Room {room_number} is not available for the selected dates",
            error_code="ROOM_NOT_AVAILABLE"
        )

class BookingNotFoundException(NotFoundException):
    """Booking not found"""
    def __init__(self, booking_id: str):
        super().__init__(
            detail=f"Booking {booking_id} not found",
            error_code="BOOKING_NOT_FOUND"
        )

class InsufficientStockException(ConflictException):
    """Insufficient stock for product"""
    def __init__(self, product_name: str, available: int, requested: int):
        super().__init__(
            detail=f"Insufficient stock for {product_name}. Available: {available}, Requested: {requested}",
            error_code="INSUFFICIENT_STOCK"
        )

class InvalidPaymentException(BadRequestException):
    """Invalid payment amount or method"""
    def __init__(self, detail: str):
        super().__init__(
            detail=detail,
            error_code="INVALID_PAYMENT"
        )

class CustomerExistsException(ConflictException):
    """Customer already exists"""
    def __init__(self, identifier: str):
        super().__init__(
            detail=f"Customer with {identifier} already exists",
            error_code="CUSTOMER_EXISTS"
        )

# Additional Billing-specific exceptions
class BusinessRuleException(BadRequestException):
    """Business rule violation"""
    def __init__(self, detail: str):
        super().__init__(
            detail=detail,
            error_code="BUSINESS_RULE_VIOLATION"
        )

class InvoiceNotFoundException(NotFoundException):
    """Invoice not found"""
    def __init__(self, invoice_id: str):
        super().__init__(
            detail=f"Invoice {invoice_id} not found",
            error_code="INVOICE_NOT_FOUND"
        )

class PaymentProcessingException(BadRequestException):
    """Payment processing error"""
    def __init__(self, detail: str):
        super().__init__(
            detail=detail,
            error_code="PAYMENT_PROCESSING_ERROR"
        )

class ExternalServiceException(InternalServerException):
    """External service integration error"""
    def __init__(self, service: str, detail: str = None):
        super().__init__(
            detail=detail or f"External service {service} is unavailable",
            error_code="EXTERNAL_SERVICE_ERROR"
        )