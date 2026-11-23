import csv
import io
import json
import logging
import math
import uuid
from typing import AsyncGenerator, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.audit import AuditLog
from app.schemas.audit import (
    AuditLogFilterParams,
    AuditLogResponse,
    AuditLogsListResponse,
)

logger = logging.getLogger(__name__)


class AuditService:
    def __init__(
        self,
        db: AsyncSession,
        settings: Optional[Settings] = None,
    ):
        self.db = db
        self.settings = settings or get_settings()

    def _build_conditions(self, filters: AuditLogFilterParams):
        conditions = []
        if filters.user:
            conditions.append(AuditLog.username.ilike(f"%{filters.user}%"))
        if filters.action:
            conditions.append(AuditLog.action.ilike(f"%{filters.action}%"))
        if filters.target_type:
            conditions.append(AuditLog.target_type == filters.target_type)
        if filters.target_id:
            conditions.append(AuditLog.target_id.ilike(f"%{filters.target_id}%"))
        if filters.result:
            conditions.append(AuditLog.result == filters.result)
        if filters.since:
            conditions.append(AuditLog.timestamp >= filters.since)
        if filters.until:
            conditions.append(AuditLog.timestamp <= filters.until)
        return conditions

    async def list_audit_logs(
        self, filters: AuditLogFilterParams
    ) -> AuditLogsListResponse:
        conditions = self._build_conditions(filters)

        count_stmt = select(func.count(AuditLog.id))
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        page = max(1, filters.page)
        page_size = min(
            max(1, filters.page_size), self.settings.audit_page_size_max
        )

        query = select(AuditLog)
        if conditions:
            query = query.where(*conditions)

        if filters.sort_order.lower() == "asc":
            query = query.order_by(AuditLog.timestamp.asc(), AuditLog.id.asc())
        else:
            query = query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())

        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        records = result.scalars().all()

        total_pages = math.ceil(total / page_size) if total > 0 else 1

        items = [AuditLogResponse.model_validate(rec) for rec in records]
        return AuditLogsListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_audit_log(self, audit_id: str) -> Optional[AuditLogResponse]:
        try:
            parsed_id = uuid.UUID(audit_id)
        except ValueError:
            return None

        stmt = select(AuditLog).where(AuditLog.id == parsed_id)
        result = await self.db.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            return None
        return AuditLogResponse.model_validate(record)

    async def stream_audit_export_csv(
        self, filters: AuditLogFilterParams
    ) -> AsyncGenerator[str, None]:
        conditions = self._build_conditions(filters)

        header = [
            "id",
            "timestamp",
            "user_id",
            "username",
            "action",
            "target_type",
            "target_id",
            "result",
            "error_message",
            "ip_address",
            "payload",
        ]
        string_buffer = io.StringIO()
        writer = csv.writer(string_buffer)
        writer.writerow(header)
        yield string_buffer.getvalue()
        string_buffer.seek(0)
        string_buffer.truncate(0)

        chunk_size = 200
        max_rows = self.settings.audit_export_max_rows
        exported_count = 0
        offset = 0

        while exported_count < max_rows:
            current_limit = min(chunk_size, max_rows - exported_count)
            query = select(AuditLog)
            if conditions:
                query = query.where(*conditions)

            if filters.sort_order.lower() == "asc":
                query = query.order_by(AuditLog.timestamp.asc(), AuditLog.id.asc())
            else:
                query = query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())

            query = query.offset(offset).limit(current_limit)
            result = await self.db.execute(query)
            batch = result.scalars().all()

            if not batch:
                break

            for rec in batch:
                payload_str = json.dumps(rec.payload) if rec.payload else ""
                row = [
                    str(rec.id),
                    rec.timestamp.isoformat() if rec.timestamp else "",
                    str(rec.user_id) if rec.user_id else "",
                    rec.username or "",
                    rec.action or "",
                    rec.target_type or "",
                    rec.target_id or "",
                    rec.result or "",
                    rec.error_message or "",
                    rec.ip_address or "",
                    payload_str,
                ]
                writer.writerow(row)

            yield string_buffer.getvalue()
            string_buffer.seek(0)
            string_buffer.truncate(0)

            exported_count += len(batch)
            offset += len(batch)

            if len(batch) < current_limit:
                break
