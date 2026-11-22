import logging
from typing import Any, Dict, Optional, Tuple
import httpx

from app.services.notifiers.base import BaseNotifier

logger = logging.getLogger(__name__)


class SlackNotifier(BaseNotifier):
    def __init__(self, config: Dict[str, Any], secret: Optional[str] = None):
        # Webhook URL may be in secret or config
        self.webhook_url: str = secret or config.get("webhook_url", "")

    async def send(
        self,
        title: str,
        message: str,
        severity: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, Optional[str]]:
        if not self.webhook_url:
            return False, "Slack webhook URL is missing"

        color_map = {
            "critical": "#f44336",
            "warning": "#ff9800",
            "info": "#2196f3",
        }
        color = color_map.get(severity.lower(), "#9e9e9e")

        fields = []
        if details:
            for k, v in details.items():
                fields.append({"title": str(k), "value": str(v), "short": True})

        payload = {
            "text": f"*[DockPilot {severity.upper()}]* {title}",
            "attachments": [
                {
                    "color": color,
                    "title": title,
                    "text": message,
                    "fields": fields,
                    "footer": "DockPilot Alert System",
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.webhook_url, json=payload)
                if res.status_code >= 400:
                    return False, f"Slack API error ({res.status_code}): {res.text}"
                return True, None
        except Exception as e:
            logger.error("Failed to send Slack alert: %s", e)
            return False, str(e)
