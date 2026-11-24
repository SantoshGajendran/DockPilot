import os
import pytest
from app.core.config import Settings, get_settings
from app.core.constants import AuditResult, Role

def test_settings_load_from_yaml(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_settings.cache_clear()
    try:
        settings = get_settings()
        assert settings.app_name == "DockPilot"
        assert settings.environment == "development"
        assert settings.host == "127.0.0.1"
        assert settings.port == 8000
        assert settings.database_url == "postgresql+asyncpg://dockpilot:dockpilot@127.0.0.1:5432/dockpilot"
        assert settings.docker_host == "tcp://127.0.0.1:2375"
        assert "http://localhost:4200" in settings.cors_origins
        assert settings.collection_interval_seconds == 5
        assert settings.retention_days == 30
        assert settings.log_tail_default == 200
        assert settings.jwt_secret == "dev-secret-key-change-in-production-min-32-chars-long"
        assert settings.jwt_access_expire_minutes == 15
        assert settings.jwt_refresh_expire_days == 7
        assert settings.max_login_attempts == 5
        assert settings.lockout_duration_minutes == 15
        assert settings.default_admin_user == "admin"
        assert settings.default_admin_password == "dockpilot_admin_2026"
    finally:
        os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
        get_settings.cache_clear()

def test_roles_and_audit_constants():
    assert Role.VIEWER == "viewer"
    assert Role.OPERATOR == "operator"
    assert Role.ADMIN == "admin"
    assert AuditResult.PENDING == "pending"
    assert AuditResult.SUCCESS == "success"
    assert AuditResult.FAILURE == "failure"

def test_settings_default_values():
    defaults = Settings()
    assert defaults.app_name == "DockPilot"
    assert defaults.port == 8000
    assert defaults.max_login_attempts == 5
    assert defaults.lockout_duration_minutes == 15
    assert defaults.default_admin_user == "admin"
    assert defaults.default_admin_password == "dockpilot_admin_2026"
