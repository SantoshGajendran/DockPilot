import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import smtplib
from typing import Any, Dict, List, Optional, Tuple

from app.services.notifiers.base import BaseNotifier

logger = logging.getLogger(__name__)


class EmailNotifier(BaseNotifier):
    def __init__(self, config: Dict[str, Any], secret: Optional[str] = None):
        self.host: str = config.get("smtp_host", "localhost")
        self.port: int = int(config.get("smtp_port", 587))
        self.use_tls: bool = bool(config.get("use_tls", True))
        self.from_address: str = config.get("from_address", "dockpilot@localhost")
        raw_to = config.get("to_addresses", [])
        if isinstance(raw_to, str):
            self.to_addresses: List[str] = [e.strip() for e in raw_to.split(",") if e.strip()]
        else:
            self.to_addresses = list(raw_to)
        self.username: Optional[str] = config.get("username")
        self.password: Optional[str] = secret

    def _send_sync(self, msg: MIMEMultipart) -> None:
        if self.use_tls:
            server = smtplib.SMTP(self.host, self.port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(self.host, self.port, timeout=10)

        if self.username and self.password:
            server.login(self.username, self.password)

        server.sendmail(self.from_address, self.to_addresses, msg.as_string())
        server.quit()

    async def send(
        self,
        title: str,
        message: str,
        severity: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, Optional[str]]:
        if not self.to_addresses:
            return False, "No recipient addresses specified"

        msg = MIMEMultipart()
        msg["From"] = self.from_address
        msg["To"] = ", ".join(self.to_addresses)
        msg["Subject"] = f"[DockPilot {severity.upper()}] {title}"

        body = f"{title}\n\nSeverity: {severity.upper()}\n\n{message}\n"
        if details:
            body += "\nDetails:\n"
            for k, v in details.items():
                body += f"  - {k}: {v}\n"

        msg.attach(MIMEText(body, "plain"))

        try:
            await asyncio.to_thread(self._send_sync, msg)
            return True, None
        except Exception as e:
            logger.error("Failed to send email alert: %s", e)
            return False, str(e)
