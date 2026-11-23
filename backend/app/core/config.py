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
    host_metrics_interval_seconds: int = 3
    host_top_processes_count: int = 10
    host_cpu_warning_threshold: float = 80.0
    host_cpu_critical_threshold: float = 90.0
    host_memory_warning_threshold: float = 80.0
    host_memory_critical_threshold: float = 90.0
    host_disk_warning_threshold: float = 80.0
    host_disk_critical_threshold: float = 90.0
    compose_project_allow_paths: List[str] = [
        "/opt/stacks",
        "/home/ubuntu/dockpilot",
        "/var/dockpilot/compose",
        "c:/Santosh/Development/dockpilot",
        ".",
    ]
    compose_project_paths: dict = {
        "dockpilot": ".",
        "web": "/opt/stacks/web",
        "worker": "/opt/stacks/worker",
        "cache": "/opt/stacks/cache",
    }
    compose_job_timeout_seconds: int = 300
    events_retention_days: int = 30
    events_reconnect_interval_seconds: float = 3.0
    restart_loop_window_seconds: int = 300
    restart_loop_threshold: int = 3
    events_page_size_default: int = 50
    events_page_size_max: int = 200
    alert_eval_interval_seconds: int = 15
    alert_default_cooldown_minutes: int = 15
    notification_encryption_key: str = ""
    notification_max_retries: int = 3
    protected_images: List[str] = ["dockpilot*", "postgres*", "redis*"]
    protected_volumes: List[str] = ["*dockpilot*", "*postgres*"]
    protected_networks: List[str] = ["bridge", "host", "none", "dockpilot*"]
    prune_token_expire_seconds: int = 300
    terminal_enabled: bool = False
    terminal_idle_timeout_seconds: int = 300
    terminal_max_session_seconds: int = 3600
    terminal_max_concurrent_sessions: int = 5
    terminal_record_sessions: bool = True
    terminal_transcript_retention_days: int = 30
    terminal_default_shell: str = "/bin/sh"
    terminal_allowed_shells: List[str] = ["/bin/sh", "/bin/bash", "sh", "bash"]
    audit_page_size_default: int = 50
    audit_page_size_max: int = 200
    audit_export_max_rows: int = 5000
    audit_retention_days: int = 90


@lru_cache
def get_settings() -> Settings:
    config_path = Path(__file__).resolve().parents[3] / "config" / "app.yaml"
    if not config_path.exists():
        config_path = Path("config/app.yaml")
    data = {}
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    
    resources_path = config_path.parent / "resources.yaml"
    if not resources_path.exists():
        resources_path = Path("config/resources.yaml")
    if resources_path.exists():
        with open(resources_path, "r", encoding="utf-8") as f:
            res_data = yaml.safe_load(f) or {}
            data.update(res_data)

    terminal_path = config_path.parent / "terminal.yaml"
    if not terminal_path.exists():
        terminal_path = Path("config/terminal.yaml")
    if terminal_path.exists():
        with open(terminal_path, "r", encoding="utf-8") as f:
            term_data = yaml.safe_load(f) or {}
            data.update(term_data)

    audit_path = config_path.parent / "audit.yaml"
    if not audit_path.exists():
        audit_path = Path("config/audit.yaml")
    if audit_path.exists():
        with open(audit_path, "r", encoding="utf-8") as f:
            audit_data = yaml.safe_load(f) or {}
            data.update(audit_data)

    import os
    for k in list(data.keys()):
        env_val = os.getenv(k.upper())
        if env_val is not None:
            if env_val.lower() in ("true", "1", "yes"):
                data[k] = True
            elif env_val.lower() in ("false", "0", "no"):
                data[k] = False
            elif env_val.isdigit():
                data[k] = int(env_val)
            else:
                data[k] = env_val

    if data:
        return Settings(**data)
    return Settings()
