import json
import logging
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_docker_gateway
from app.core.logging_config import JSONFormatter
from app.core.metrics import metrics_registry
from app.docker.fake import FakeGateway
from app.main import create_app


@pytest.mark.asyncio
async def test_security_headers_present():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        headers = response.headers
        assert headers.get("x-content-type-options") == "nosniff"
        assert headers.get("x-frame-options") == "DENY"
        assert headers.get("x-xss-protection") == "1; mode=block"
        assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
        assert "default-src 'self'" in headers.get("content-security-policy", "")
        assert "geolocation=()" in headers.get("permissions-policy", "")


@pytest.mark.asyncio
async def test_request_body_size_limit():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Body larger than 10MB
        oversized_headers = {"content-length": str(11 * 1024 * 1024)}
        response = await client.post("/api/v1/auth/login", headers=oversized_headers, content=b"x")
        assert response.status_code == 413
        data = response.json()
        assert "Payload Too Large" in data.get("detail", "")


@pytest.mark.asyncio
async def test_prometheus_metrics_endpoint():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Call an endpoint first to produce telemetry
        await client.get("/health")

        response = await client.get("/metrics")
        assert response.status_code == 200
        assert "text/plain" in response.headers.get("content-type", "")

        body = response.text
        assert "dockpilot_app_info" in body
        assert "dockpilot_http_requests_total" in body
        assert "dockpilot_monitored_containers_total" in body
        assert "dockpilot_active_sessions_total" in body
        assert "dockpilot_active_alerts_total" in body


@pytest.mark.asyncio
async def test_prometheus_metrics_api_v1():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 200
        assert "dockpilot_app_info" in response.text


def test_json_formatter():
    formatter = JSONFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test_path.py",
        lineno=42,
        msg="Test log message",
        args=(),
        exc_info=None,
    )
    record.path = "/api/v1/containers"
    record.status_code = 200
    record.duration_ms = 12.5

    formatted = formatter.format(record)
    parsed = json.loads(formatted)
    assert parsed["level"] == "INFO"
    assert parsed["logger"] == "test_logger"
    assert parsed["message"] == "Test log message"
    assert parsed["path"] == "/api/v1/containers"
    assert parsed["status_code"] == 200
    assert parsed["duration_ms"] == 12.5
    assert "timestamp" in parsed
