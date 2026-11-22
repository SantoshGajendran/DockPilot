from datetime import datetime, timezone
import hashlib
import hmac
import json
import logging
from typing import Any, Dict, Optional, Tuple
import httpx

from app.services.notifiers.base import BaseNotifier

logger = logging.getLogger(__name__)


class WebhookNotifier(BaseNotifier):
    def __init__(self, config: Dict[str, Any], secret: Optional[str] = None):
        self.url: str = config.get("url", "")
        self.headers: Dict[str, str] = config.get("headers", {}) or {}
        self.secret_token: Optional[str] = secret or config.get("secret_token")

    async def send(
        self,
        title: str,
        message: str,
        severity: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, Optional[str]]:
        if not self.url:
            return False, "Webhook URL is missing"

        payload = {
            "title": title,
            "message": message,
            "severity": severity,
            "details": details or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        body_bytes = json.dumps(payload).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "DockPilot-Alerts/1.0",
            **self.headers,
        }

        if self.secret_token:
            signature = hmac.new(
                self.secret_token.encode("utf-8"), body_bytes, hashlib.sha256
            ).hexdigest()
            headers["X-DockPilot-Signature"] = f"sha256={signature}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.url, content=body_bytes, headers=headers)
                if res.status_code >= 400:
                    return False, f"Webhook returned HTTP {res.status_code}: {res.text[:200]}"
                return True, None
        except Exception as e:
            logger.error("Failed to send generic webhook: %s", e)
            return False, str(e)
