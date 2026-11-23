from fastapi import APIRouter, Response
from sqlalchemy import func, select
from app.core.database import async_session
from app.core.metrics import metrics_registry
from app.models.alert import AlertEvent
from app.models.terminal import TerminalSession

router = APIRouter()


@router.get("/metrics")
async def get_prometheus_metrics():
    """Expose application and Docker monitoring telemetry in Prometheus text format."""
    try:
        async with async_session() as session:
            alert_count = await session.scalar(
                select(func.count(AlertEvent.id)).where(AlertEvent.status == "firing")
            )
            metrics_registry.set_active_alerts(alert_count or 0)

            sess_count = await session.scalar(
                select(func.count(TerminalSession.id)).where(TerminalSession.is_active.is_(True))
            )
            metrics_registry.set_active_sessions(sess_count or 0)
    except Exception:
        pass

    content = metrics_registry.generate_metrics_text()
    return Response(content=content, media_type="text/plain; version=0.0.4; charset=utf-8")
