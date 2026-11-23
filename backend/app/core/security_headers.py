from fastapi import HTTPException
from fastapi.responses import JSONResponse
from app.core.config import get_settings


class SecurityHeadersMiddleware:
    """ASGI Middleware to append security headers to all HTTP responses."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                security_headers = [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"x-xss-protection", b"1; mode=block"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (
                        b"content-security-policy",
                        b"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';",
                    ),
                    (b"permissions-policy", b"geolocation=(), microphone=(), camera=()"),
                ]
                headers.extend(security_headers)
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)


class RequestSizeLimitMiddleware:
    """ASGI Middleware to enforce request body size limits (default: 10MB)."""

    def __init__(self, app, max_bytes: int = 10 * 1024 * 1024):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                length = int(content_length.decode("latin1"))
                if length > self.max_bytes:
                    response = JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Payload Too Large: request body exceeds maximum allowed size ({self.max_bytes} bytes)"
                        },
                    )
                    await response(scope, receive, send)
                    return
            except ValueError:
                pass

        received_bytes = 0

        async def custom_receive():
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                body = message.get("body", b"")
                received_bytes += len(body)
                if received_bytes > self.max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Payload Too Large: request body exceeds maximum allowed size ({self.max_bytes} bytes)",
                    )
            return message

        try:
            await self.app(scope, custom_receive, send)
        except HTTPException as exc:
            response = JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
            await response(scope, receive, send)
