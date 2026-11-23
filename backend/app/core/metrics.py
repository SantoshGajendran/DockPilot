import time
from collections import defaultdict
from threading import Lock
from typing import Dict, Tuple


class PrometheusMetricsRegistry:
    """Thread-safe in-memory metrics registry formatted as Prometheus OpenMetrics 0.0.4."""

    def __init__(self):
        self._lock = Lock()
        self.http_requests_total: Dict[Tuple[str, str, str], int] = defaultdict(int)
        self.http_request_duration_sum: Dict[Tuple[str, str], float] = defaultdict(float)
        self.http_request_duration_count: Dict[Tuple[str, str], int] = defaultdict(int)
        self.monitored_containers_total: Dict[str, int] = defaultdict(int)
        self.active_sessions_total: int = 0
        self.active_alerts_total: int = 0
        self.app_version: str = "1.0.0"

    def record_request(self, method: str, path: str, status: int, duration_seconds: float) -> None:
        norm_path = self._normalize_path(path)
        with self._lock:
            self.http_requests_total[(method, norm_path, str(status))] += 1
            self.http_request_duration_sum[(method, norm_path)] += duration_seconds
            self.http_request_duration_count[(method, norm_path)] += 1

    def set_monitored_containers(self, counts: Dict[str, int]) -> None:
        with self._lock:
            self.monitored_containers_total.clear()
            for status, count in counts.items():
                self.monitored_containers_total[status] = count

    def set_active_sessions(self, count: int) -> None:
        with self._lock:
            self.active_sessions_total = count

    def set_active_alerts(self, count: int) -> None:
        with self._lock:
            self.active_alerts_total = count

    def set_app_version(self, version: str) -> None:
        with self._lock:
            self.app_version = version

    def _normalize_path(self, path: str) -> str:
        parts = [p for p in path.strip("/").split("/") if p]
        norm_parts = []
        for p in parts:
            if len(p) >= 12 and all(c in "0123456789abcdefABCDEF" for c in p):
                norm_parts.append("{id}")
            elif p.isdigit():
                norm_parts.append("{id}")
            else:
                norm_parts.append(p)
        return "/" + "/".join(norm_parts) if norm_parts else "/"

    def generate_metrics_text(self) -> str:
        with self._lock:
            lines = []

            # dockpilot_app_info
            lines.append("# HELP dockpilot_app_info Application build information.")
            lines.append("# TYPE dockpilot_app_info gauge")
            lines.append(f'dockpilot_app_info{{version="{self.app_version}"}} 1')

            # dockpilot_http_requests_total
            lines.append("# HELP dockpilot_http_requests_total Total number of HTTP requests processed.")
            lines.append("# TYPE dockpilot_http_requests_total counter")
            for (m, p, s), count in sorted(self.http_requests_total.items()):
                lines.append(f'dockpilot_http_requests_total{{method="{m}",path="{p}",status="{s}"}} {count}')

            # dockpilot_http_request_duration_seconds
            lines.append("# HELP dockpilot_http_request_duration_seconds Latency of HTTP requests.")
            lines.append("# TYPE dockpilot_http_request_duration_seconds summary")
            for (m, p), count in sorted(self.http_request_duration_count.items()):
                total_dur = self.http_request_duration_sum[(m, p)]
                lines.append(f'dockpilot_http_request_duration_seconds_sum{{method="{m}",path="{p}"}} {total_dur:.6f}')
                lines.append(f'dockpilot_http_request_duration_seconds_count{{method="{m}",path="{p}"}} {count}')

            # dockpilot_monitored_containers_total
            lines.append("# HELP dockpilot_monitored_containers_total Monitored Docker containers by status.")
            lines.append("# TYPE dockpilot_monitored_containers_total gauge")
            for status, count in sorted(self.monitored_containers_total.items()):
                lines.append(f'dockpilot_monitored_containers_total{{status="{status}"}} {count}')

            # dockpilot_active_sessions_total
            lines.append("# HELP dockpilot_active_sessions_total Active user/terminal sessions.")
            lines.append("# TYPE dockpilot_active_sessions_total gauge")
            lines.append(f"dockpilot_active_sessions_total {self.active_sessions_total}")

            # dockpilot_active_alerts_total
            lines.append("# HELP dockpilot_active_alerts_total Number of currently firing alerts.")
            lines.append("# TYPE dockpilot_active_alerts_total gauge")
            lines.append(f"dockpilot_active_alerts_total {self.active_alerts_total}")

            lines.append("")
            return "\n".join(lines)


metrics_registry = PrometheusMetricsRegistry()


class MetricsMiddleware:
    """ASGI Middleware to collect request latency and status codes for Prometheus."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        path = scope.get("path", "/")
        status_code = 200
        start_time = time.perf_counter()

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration = time.perf_counter() - start_time
            if not path.endswith("/metrics"):
                metrics_registry.record_request(method, path, status_code, duration)
