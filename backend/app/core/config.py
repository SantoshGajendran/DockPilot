import os
from functools import lru_cache
from pathlib import Path
from typing import List
import yaml
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "DockPilot"
    environment: str = "development"
    host: str = "127.0.0.1"
    port: int = 8000
    database_url: str = "postgresql+asyncpg://dockpilot:dockpilot@127.0.0.1:5432/dockpilot"
    docker_host: str = "tcp://127.0.0.1:2375"
    cors_origins: List[str] = ["http://localhost:4200", "http://127.0.0.1:4200"]
    collection_interval_seconds: int = 5
    retention_days: int = 30
    log_tail_default: int = 200
    log_search_max_bytes_scanned: int = 10485760
    log_stream_buffer_max_lines: int = 1000
    log_backpressure_drop_threshold: int = 500
    metrics_interval_seconds: int = 3
    top_containers_limit: int = 5
    recent_events_limit: int = 10
    stale_threshold_multiplier: float = 2.0
    jwt_secret: str = "dev-secret-key-change-in-production-min-32-chars-long"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    default_admin_user: str = "admin"
    default_admin_password: str = "dockpilot_admin_2026"
    auth_cookie_path: str = "/"
    containers_page_size_default: int = 20
    containers_page_size_max: int = 100
    delete_token_expire_seconds: int = 60
    containers_stream_interval_seconds: int = 3
    secret_mask_patterns: List[str] = [
        "*PASSWORD*",
        "*SECRET*",
        "*TOKEN*",
        "*KEY*",
        "*AUTH*",
        "*CREDENTIAL*",
        "*PRIVATE*",
    ]
    container_detail_stats_interval_seconds: int = 2


@lru_cache
def get_settings() -> Settings:
    config_path = Path(__file__).resolve().parents[3] / "config" / "app.yaml"
    if not config_path.exists():
        config_path = Path("config/app.yaml")
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
            return Settings(**data)
    return Settings()
