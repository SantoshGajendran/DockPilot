import asyncio
import logging
from typing import Any, Dict, Optional, Tuple

from app.models.notification import NotificationChannel
from app.services.notifiers.base import BaseNotifier
from app.services.notifiers.email_notifier import EmailNotifier
from app.services.notifiers.slack_notifier import SlackNotifier
from app.services.notifiers.telegram_notifier import TelegramNotifier
from app.services.notifiers.webhook_notifier import WebhookNotifier

logger = logging.getLogger(__name__)


def create_notifier(channel_type: str, config: Dict[str, Any], secret: Optional[str]) -> BaseNotifier:
    t = (channel_type or "").lower().strip()
    if t == "email":
        return EmailNotifier(config, secret)
    elif t == "telegram":
        return TelegramNotifier(config, secret)
    elif t == "slack":
        return SlackNotifier(config, secret)
    elif t == "webhook":
        return WebhookNotifier(config, secret)
    else:
        raise ValueError(f"Unsupported notification channel type: {channel_type}")


async def dispatch_channel(
    channel_type: str,
    config: Dict[str, Any],
    secret: Optional[str],
    title: str,
    message: str,
    severity: str,
    details: Optional[Dict[str, Any]] = None,
    max_retries: int = 3,
    backoff_factor: float = 0.5,
) -> Tuple[bool, int, Optional[str]]:
    """Dispatches notification with exponential backoff. Returns (success, attempts, error_message)."""
    notifier = create_notifier(channel_type, config, secret)
    attempts = 0
    last_error: Optional[str] = None

    for i in range(max_retries):
        attempts += 1
        success, err = await notifier.send(title, message, severity, details)
        if success:
            return True, attempts, None

        last_error = err
        logger.warning(
            "Notification attempt %d/%d for [%s] failed: %s",
            attempts,
            max_retries,
            channel_type,
            err,
        )

        if i < max_retries - 1:
            delay = backoff_factor * (2**i)
            await asyncio.sleep(delay)

    return False, attempts, last_error
