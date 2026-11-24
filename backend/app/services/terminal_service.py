import asyncio
from datetime import datetime, timedelta, timezone
import json
import logging
import time
from typing import Any, Dict, List, Optional
import uuid

from fastapi import HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.constants import AuditResult, Role
from app.docker.interface import DockerGateway
from app.models.audit import AuditLog
from app.models.terminal import TerminalSession
from app.models.user import User
from app.schemas.terminal import (
    TerminalResizeMessage,
    TerminalSessionResponse,
    TerminalSessionsListResponse,
    TerminalStatusResponse,
)

logger = logging.getLogger(__name__)

# Global registry for active concurrent terminal sessions
_ACTIVE_TERMINAL_SESSIONS: Dict[str, Dict[str, Any]] = {}


async def _write_to_exec(stream: Any, data: bytes) -> None:
    if hasattr(stream, "write"):
        res = stream.write(data)
        if asyncio.iscoroutine(res):
            await res
    elif hasattr(stream, "_sock") and stream._sock is not None:
        await asyncio.to_thread(stream._sock.sendall, data)
    elif hasattr(stream, "send"):
        await asyncio.to_thread(stream.send, data)


async def _read_from_exec(stream: Any) -> bytes:
    if hasattr(stream, "read"):
        if asyncio.iscoroutinefunction(stream.read):
            return await stream.read()
        else:
            return await asyncio.to_thread(stream.read, 4096)
    elif hasattr(stream, "_sock") and stream._sock is not None:
        return await asyncio.to_thread(stream._sock.recv, 4096)
    return b""


class TerminalService:
    @staticmethod
    def get_status() -> TerminalStatusResponse:
        settings = get_settings()
        return TerminalStatusResponse(
            enabled=settings.terminal_enabled,
            idle_timeout_seconds=settings.terminal_idle_timeout_seconds,
            max_session_seconds=settings.terminal_max_session_seconds,
            max_concurrent_sessions=settings.terminal_max_concurrent_sessions,
            active_sessions_count=len(_ACTIVE_TERMINAL_SESSIONS),
            record_sessions=settings.terminal_record_sessions,
            allowed_shells=settings.terminal_allowed_shells,
        )

    @staticmethod
    async def list_sessions(
        db: AsyncSession,
        container_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> TerminalSessionsListResponse:
        query = select(TerminalSession)
        count_query = select(func.count(TerminalSession.id))
        if container_id:
            query = query.where(TerminalSession.container_id == container_id)
            count_query = count_query.where(TerminalSession.container_id == container_id)

        query = query.order_by(desc(TerminalSession.started_at)).limit(limit).offset(offset)
        res = await db.execute(query)
        sessions = list(res.scalars().all())

        count_res = await db.execute(count_query)
        total_count = count_res.scalar() or 0

        session_responses = [TerminalSessionResponse.model_validate(s) for s in sessions]
        return TerminalSessionsListResponse(sessions=session_responses, total_count=total_count)

    @staticmethod
    async def get_session(
        db: AsyncSession, session_id: uuid.UUID
    ) -> Optional[TerminalSessionResponse]:
        query = select(TerminalSession).where(TerminalSession.id == session_id)
        res = await db.execute(query)
        session = res.scalar_one_or_none()
        if session is None:
            return None
        return TerminalSessionResponse.model_validate(session)

    @staticmethod
    async def prune_old_sessions(db: AsyncSession) -> int:
        settings = get_settings()
        retention_days = settings.terminal_session_retention_days
        if retention_days <= 0:
            return 0
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        stmt = delete(TerminalSession).where(TerminalSession.started_at < cutoff)
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount or 0

    @staticmethod
    async def run_terminal(
        websocket: WebSocket,
        container_id: str,
        shell: str,
        user: User,
        gateway: DockerGateway,
        db_factory: Any,
        ip_address: Optional[str] = None,
    ) -> None:
        settings = get_settings()

        # 1. Feature flag check
        if not settings.terminal_enabled:
            await websocket.close(code=4404, reason="Web terminal feature is disabled")
            return

        # 2. RBAC check: ADMIN only
        if user.role != Role.ADMIN:
            await websocket.close(code=4403, reason="Admin role required for terminal access")
            return

        # 3. Allowed shells validation
        if shell not in settings.terminal_allowed_shells:
            await websocket.close(
                code=4400,
                reason=f"Shell '{shell}' is not in allowed shells: {settings.terminal_allowed_shells}",
            )
            return

        # 4. Container inspection
        try:
            container = await gateway.inspect_container(container_id)
        except Exception as e:
            await websocket.close(code=4404, reason=f"Container not found: {e}")
            return

        container_name = container.get("name", container_id)
        container_state = container.get("state", "").lower()
        if container_state != "running":
            await websocket.close(
                code=4400,
                reason=f"Container {container_id} is '{container_state}', must be 'running'",
            )
            return

        # 5. Concurrency limit check
        if len(_ACTIVE_TERMINAL_SESSIONS) >= settings.terminal_max_concurrent_sessions:
            await websocket.close(
                code=4429,
                reason=f"Maximum concurrent terminal sessions ({settings.terminal_max_concurrent_sessions}) reached",
            )
            return

        # 6. Create Docker exec session
        try:
            exec_id = await gateway.create_exec(
                container_id=container_id,
                cmd=[shell],
                tty=True,
                stdin=True,
            )
            exec_stream = await gateway.start_exec(exec_id, tty=True)
        except Exception as e:
            logger.error("Failed to start docker exec: %s", e)
            await websocket.close(code=4500, reason=f"Failed to start exec: {e}")
            return

        session_id = uuid.uuid4()
        started_at = datetime.now(timezone.utc)
        start_time_monotonic = time.monotonic()
        last_activity = time.monotonic()

        # 7. Audit log & DB session record creation
        async with db_factory() as db:
            audit_start = AuditLog(
                user_id=user.id,
                username=user.username,
                action="terminal.session_start",
                target_type="container",
                target_id=container_id,
                result=AuditResult.SUCCESS,
                payload={
                    "container_name": container_name,
                    "shell": shell,
                    "session_id": str(session_id),
                },
                ip_address=ip_address,
            )
            db.add(audit_start)

            session_record = TerminalSession(
                id=session_id,
                container_id=container_id,
                container_name=container_name,
                user_id=user.id,
                username=user.username,
                shell=shell,
                started_at=started_at,
                status="active",
                ip_address=ip_address,
            )
            db.add(session_record)
            await db.commit()

        _ACTIVE_TERMINAL_SESSIONS[str(session_id)] = {
            "session_id": str(session_id),
            "container_id": container_id,
            "container_name": container_name,
            "user_id": str(user.id),
            "username": user.username,
            "started_at": started_at,
        }

        # 8. Accept WebSocket connection
        await websocket.accept()

        bytes_sent = 0
        bytes_received = 0
        transcript_chunks: List[str] = []
        max_transcript_chars = 100_000
        current_transcript_len = 0
        exit_status = "completed"

        client_to_docker_task: Optional[asyncio.Task] = None
        docker_to_client_task: Optional[asyncio.Task] = None
        watchdog_task: Optional[asyncio.Task] = None

        stop_event = asyncio.Event()

        async def client_to_docker_loop() -> None:
            nonlocal bytes_sent, last_activity, exit_status
            try:
                while not stop_event.is_set():
                    msg = await websocket.receive()
                    last_activity = time.monotonic()

                    if msg.get("type") == "websocket.disconnect":
                        exit_status = "disconnected"
                        stop_event.set()
                        break

                    text = msg.get("text")
                    binary = msg.get("bytes")

                    if text is not None:
                        # Check for resize message
                        if text.startswith("{") and "resize" in text:
                            try:
                                parsed = json.loads(text)
                                if parsed.get("type") == "resize":
                                    cols = int(parsed.get("cols", 80))
                                    rows = int(parsed.get("rows", 24))
                                    await gateway.resize_exec(exec_id, height=rows, width=cols)
                                    continue
                            except Exception:
                                pass

                        payload_bytes = text.encode("utf-8")
                    elif binary is not None:
                        payload_bytes = binary
                    else:
                        continue

                    bytes_sent += len(payload_bytes)
                    await _write_to_exec(exec_stream, payload_bytes)
            except WebSocketDisconnect:
                exit_status = "disconnected"
                stop_event.set()
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.warning("Error in client_to_docker: %s", e)
                exit_status = "error"
                stop_event.set()

        async def docker_to_client_loop() -> None:
            nonlocal bytes_received, current_transcript_len, exit_status
            try:
                while not stop_event.is_set():
                    chunk = await _read_from_exec(exec_stream)
                    if not chunk:
                        # Check if session/stream has closed
                        if getattr(exec_stream, "closed", False):
                            exit_status = "completed"
                            stop_event.set()
                            break
                        await asyncio.sleep(0.02)
                        continue

                    bytes_received += len(chunk)

                    # Record transcript if enabled
                    if settings.terminal_record_sessions and current_transcript_len < max_transcript_chars:
                        text_chunk = chunk.decode("utf-8", errors="replace")
                        transcript_chunks.append(text_chunk)
                        current_transcript_len += len(text_chunk)

                    await websocket.send_bytes(chunk)
            except WebSocketDisconnect:
                exit_status = "disconnected"
                stop_event.set()
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.warning("Error in docker_to_client: %s", e)
                exit_status = "error"
                stop_event.set()

        async def watchdog_loop() -> None:
            nonlocal exit_status
            try:
                while not stop_event.is_set():
                    await asyncio.sleep(0.2)
                    now = time.monotonic()

                    # Idle timeout
                    if (now - last_activity) >= settings.terminal_idle_timeout_seconds:
                        logger.info("Terminal session %s timed out due to inactivity", session_id)
                        exit_status = "idle_timeout"
                        stop_event.set()
                        break

                    # Max session duration
                    if (now - start_time_monotonic) >= settings.terminal_max_session_seconds:
                        logger.info("Terminal session %s reached maximum duration", session_id)
                        exit_status = "max_duration_exceeded"
                        stop_event.set()
                        break
            except asyncio.CancelledError:
                pass

        try:
            client_to_docker_task = asyncio.create_task(client_to_docker_loop())
            docker_to_client_task = asyncio.create_task(docker_to_client_loop())
            watchdog_task = asyncio.create_task(watchdog_loop())

            # Wait until any task triggers stop
            await stop_event.wait()
        finally:
            # Cancel loops
            for t in [client_to_docker_task, docker_to_client_task, watchdog_task]:
                if t and not t.done():
                    t.cancel()

            # Clean active sessions registry
            _ACTIVE_TERMINAL_SESSIONS.pop(str(session_id), None)

            ended_at = datetime.now(timezone.utc)
            duration_seconds = max(0, int((ended_at - started_at).total_seconds()))
            full_transcript = "".join(transcript_chunks) if settings.terminal_record_sessions else None

            # Persist termination state and audit log
            try:
                async with db_factory() as db:
                    query = select(TerminalSession).where(TerminalSession.id == session_id)
                    res = await db.execute(query)
                    sess = res.scalar_one_or_none()
                    if sess:
                        sess.ended_at = ended_at
                        sess.duration_seconds = duration_seconds
                        sess.status = exit_status
                        sess.bytes_sent = bytes_sent
                        sess.bytes_received = bytes_received
                        sess.transcript = full_transcript

                    audit_end = AuditLog(
                        user_id=user.id,
                        username=user.username,
                        action="terminal.session_end",
                        target_type="container",
                        target_id=container_id,
                        result=AuditResult.SUCCESS,
                        payload={
                            "container_name": container_name,
                            "session_id": str(session_id),
                            "duration_seconds": duration_seconds,
                            "exit_status": exit_status,
                            "bytes_sent": bytes_sent,
                            "bytes_received": bytes_received,
                        },
                        ip_address=ip_address,
                    )
                    db.add(audit_end)
                    await db.commit()
            except Exception as e:
                logger.error("Failed to record terminal session end: %s", e)

            # Close WebSocket if still open
            try:
                close_code = 1000
                close_reason = "Session closed"
                if exit_status == "idle_timeout":
                    close_code = 4408
                    close_reason = "Idle timeout"
                elif exit_status == "max_duration_exceeded":
                    close_code = 4409
                    close_reason = "Max session duration exceeded"

                await websocket.close(code=close_code, reason=close_reason)
            except Exception:
                pass
