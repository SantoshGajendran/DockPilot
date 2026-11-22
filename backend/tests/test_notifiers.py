import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
import httpx

from app.core.encryption import decrypt_secret, encrypt_secret
from app.services.notifiers.dispatcher import create_notifier, dispatch_channel
from app.services.notifiers.email_notifier import EmailNotifier
from app.services.notifiers.slack_notifier import SlackNotifier
from app.services.notifiers.telegram_notifier import TelegramNotifier
from app.services.notifiers.webhook_notifier import WebhookNotifier


def test_encryption_roundtrip():
    secret = "my-super-secret-bot-token-123456"
    encrypted = encrypt_secret(secret)
    assert encrypted is not None
    assert encrypted != secret

    decrypted = decrypt_secret(encrypted)
    assert decrypted == secret

    assert encrypt_secret(None) is None
    assert decrypt_secret(None) is None
    assert decrypt_secret("invalid-ciphertext") is None


@pytest.mark.asyncio
async def test_email_notifier_mocked():
    config = {
        "smtp_host": "smtp.example.com",
        "smtp_port": 587,
        "from_address": "alerts@dockpilot.io",
        "to_addresses": ["admin@example.com"],
        "use_tls": True,
        "username": "alertuser",
    }
    secret = "smtp-password"
    notifier = EmailNotifier(config, secret)

    with patch("smtplib.SMTP") as mock_smtp_cls:
        mock_server = MagicMock()
        mock_smtp_cls.return_value = mock_server

        success, err = await notifier.send(
            title="Container Down",
            message="Database container stopped",
            severity="critical",
            details={"container_id": "c_db"},
        )

        assert success is True
        assert err is None
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("alertuser", "smtp-password")
        mock_server.sendmail.assert_called_once()
        mock_server.quit.assert_called_once()


@pytest.mark.asyncio
async def test_telegram_notifier_mocked():
    config = {"chat_id": "-100987654321"}
    secret = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
    notifier = TelegramNotifier(config, secret)

    mock_response = MagicMock(status_code=200, text='{"ok": true}')

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        success, err = await notifier.send(
            title="High CPU Alert",
            message="CPU sustained at 95%",
            severity="warning",
            details={"cpu": "95%"},
        )

        assert success is True
        assert err is None
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert secret in args[0]
        assert kwargs["json"]["chat_id"] == "-100987654321"
        assert "High CPU Alert" in kwargs["json"]["text"]


@pytest.mark.asyncio
async def test_webhook_notifier_mocked():
    config = {"url": "https://webhook.site/test-endpoint"}
    secret = "hmac-secret-token"
    notifier = WebhookNotifier(config, secret)

    mock_response = MagicMock(status_code=200, text="OK")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        success, err = await notifier.send(
            title="Disk High",
            message="Root storage at 90%",
            severity="critical",
        )

        assert success is True
        assert err is None
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        assert "X-DockPilot-Signature" in kwargs["headers"]
        assert kwargs["headers"]["X-DockPilot-Signature"].startswith("sha256=")


@pytest.mark.asyncio
async def test_slack_notifier_mocked():
    config = {}
    secret = "https://hooks.slack.com/services/T00/B00/XXXX"
    notifier = SlackNotifier(config, secret)

    mock_response = MagicMock(status_code=200, text="ok")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        success, err = await notifier.send(
            title="Restart Loop",
            message="Worker container crashed 5 times",
            severity="critical",
        )

        assert success is True
        assert err is None
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0] == secret
        assert kwargs["json"]["attachments"][0]["color"] == "#f44336"


@pytest.mark.asyncio
async def test_dispatcher_retry_and_give_up():
    config = {"url": "https://webhook.test/fail"}
    notifier = WebhookNotifier(config)

    # 1. Fail twice then succeed on 3rd attempt
    mock_fail = MagicMock(status_code=500, text="Internal Error")
    mock_ok = MagicMock(status_code=200, text="OK")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [mock_fail, mock_fail, mock_ok]

        success, attempts, err = await dispatch_channel(
            channel_type="webhook",
            config=config,
            secret=None,
            title="Retry Test",
            message="Testing retries",
            severity="warning",
            max_retries=3,
            backoff_factor=0.01,
        )

        assert success is True
        assert attempts == 3
        assert err is None

    # 2. Fail all 3 times -> give up
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [mock_fail, mock_fail, mock_fail]

        success, attempts, err = await dispatch_channel(
            channel_type="webhook",
            config=config,
            secret=None,
            title="Fail Test",
            message="Testing failure",
            severity="critical",
            max_retries=3,
            backoff_factor=0.01,
        )

        assert success is False
        assert attempts == 3
        assert "500" in (err or "")
