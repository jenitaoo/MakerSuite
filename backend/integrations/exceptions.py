"""
This module defines custom exceptions for handling errors related to platform integrations.
It includes a base exception class and specific exceptions for
- authentication errors (401),
- API errors (4xx, 5xx)
- rate limit errors (429)
- validation errors (400)
- not found errors (404).
"""

from typing import Optional, Dict, Any


class PlatformIntegrationError(Exception):
    """
    Base exception for all platform integration errors.

    All platform-specific errors inherit from this, enabling:
    - Consistent error handling at view/service layer
    - Meaningful HTTP status code mapping
    - Detailed error context for logging/debugging

    Design decision: Separates platform errors from Django/system errors,
    making it clear which errors are recoverable vs require re-authentication.
    """

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        platform: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        status_code: Optional[int] = None,
    ):
        self.message = message
        self.error_code = error_code or "UNKNOWN_ERROR"
        self.platform = platform
        self.details = details or {}
        self.status_code = status_code or 500
        super().__init__(self.message)


class PlatformAuthError(PlatformIntegrationError):
    """
    Raised when authentication/authorization fails.

    Scenarios:
    - Access token expired AND refresh failed
    - Refresh token invalid/expired (>90 days inactive)
    - OAuth scope insufficient
    - Shop access revoked

    Recovery: User must re-authenticate (redirect to OAuth flow)
    HTTP response: 401 Unauthorized
    """

    def __init__(
        self,
        message: str,
        platform: Optional[str] = None,
        requires_reauth: bool = True,
        **kwargs
    ):
        self.requires_reauth = requires_reauth
        kwargs['status_code'] = 401
        super().__init__(
            message,
            error_code="AUTH_ERROR",
            platform=platform,
            **kwargs
        )


class PlatformAPIError(PlatformIntegrationError):
    """
    Raised when API call fails (HTTP 4xx/5xx, timeout, connection error).

    May be retryable depending on status code:
    - 5xx errors: YES (temporary server issue)
    - 429 errors: YES (rate limit — use RateLimitError instead)
    - 4xx errors: NO (client error)

    Design decision: retryable flag allows caller to implement exponential backoff.
    """

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        platform: Optional[str] = None,
        retryable: bool = False,
        **kwargs
    ):
        self.status_code = status_code or 500
        self.retryable = retryable or (self.status_code >= 500)
        kwargs['status_code'] = self.status_code
        super().__init__(
            message,
            error_code="API_ERROR",
            platform=platform,
            details={"retryable": self.retryable},
            **kwargs
        )


class PlatformRateLimitError(PlatformAPIError):
    """
    Raised when API rate limit exceeded.

    ALWAYS retryable. Caller should implement exponential backoff.

    Details:
    - retry_after: Seconds to wait before retry (from API response header)
    - limit: Rate limit window description (for debugging)

    Design decision: Separate exception type enables specific handling
    (exponential backoff, queue delay) distinct from other API errors.
    """

    def __init__(
        self,
        message: str,
        retry_after: Optional[int] = None,
        platform: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.pop("details", {})
        details["retry_after"] = retry_after or 60
        super().__init__(
            message,
            status_code=429,
            error_code="RATE_LIMIT",
            platform=platform,
            retryable=True,
            details=details,
            **kwargs
        )


class PlatformValidationError(PlatformIntegrationError):
    """
    Raised when input validation fails.

    Scenarios:
    - Required field missing
    - Field value invalid (e.g., string in int field)
    - Field too long
    - Invalid enum value

    NOT retryable. Requires fixing the request.
    HTTP response: 400 Bad Request
    """

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        platform: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.pop("details", {})
        if field:
            details["field"] = field
        kwargs['status_code'] = 400
        super().__init__(
            message,
            error_code="VALIDATION_ERROR",
            platform=platform,
            details=details,
            **kwargs
        )


class PlatformNotFoundError(PlatformAPIError):
    """
    Raised when resource doesn't exist on platform.

    Scenarios:
    - Listing deleted on Platform
    - Shop not found
    - Order not found

    NOT retryable. Resource is gone.
    HTTP response: 404 Not Found
    """

    def __init__(
        self,
        message: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        platform: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.pop("details", {})
        if resource_type:
            details["resource_type"] = resource_type
        if resource_id:
            details["resource_id"] = resource_id
        super().__init__(
            message,
            status_code=404,
            error_code="NOT_FOUND",
            platform=platform,
            retryable=False,
            details=details,
            **kwargs
        )


class PlatformUnauthorizedError(PlatformAuthError):
    """
    Raised when user lacks permission for operation (distinct from token expiry).

    Scenarios:
    - Accessing another user's shop
    - Insufficient OAuth scopes
    - Shop suspended

    This is NOT a token expiry — token is valid but user isn't allowed.
    HTTP response: 403 Forbidden
    """

    def __init__(
        self,
        message: str,
        platform: Optional[str] = None,
        **kwargs
    ):
        kwargs['status_code'] = 403
        super().__init__(
            message,
            error_code="UNAUTHORIZED",
            platform=platform,
            requires_reauth=False,
            **kwargs
        )