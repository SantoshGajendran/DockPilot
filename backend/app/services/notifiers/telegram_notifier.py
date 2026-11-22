import html
import logging
from typing import Any, Dict, Optional, Tuple
import httpx

from app.services.notifiers.base import BaseNotifier

logger = logging.getLogger(__name__)


class TelegramNotifier(BaseNotifier):
    def __init__(self, config: Dict[str, Any], secret: Optional[str] = None):
        self.bot_token: Optional[str] = secret or config.get("bot_token")
        self.chat_id: Optional[str] = config.get("chat_id")

    async def send(
        self,
        title: str,
        message: str,
        severity: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, Optional[str]]:
        if not self.bot_token:
            return False, "Telegram bot token is missing"
        if not self.chat_id:
            return False, "Telegram chat_id is missing"

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        sev_icon = "🚨" if severity == "critical" else ("⚠️" if severity == "warning" else "ℹ️")
        text = f"<b>{sev_icon} [DockPilot {html.escape(severity.upper())}] {html.escape(title)}</b>\n\n{html.escape(message)}"

        if details:
            text += "\n\n<b>Details:</b>"
            for k, v in details.items():
                text += f"\n• <code>{html.escape(str(k))}</code>: {html.escape(str(v))}"

        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code >= 400:
                    return False, f"Telegram API error ({res.status_code}): {res.text}"
                return True, None
        except Exception as e:
            logger.error("Failed to send Telegram alert: %s", e)
            return False, str(e)
