import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import AsyncGenerator, Dict, List, Optional, Set
import uuid

from app.schemas.jobs import JobResponse, JobStatus, JobStreamEvent

logger = logging.getLogger(__name__)


class JobRecord:
    def __init__(self, job_id: str, project_name: str, action: str):
        self.id = job_id
        self.project_name = project_name
        self.action = action
        self.status: JobStatus = JobStatus.PENDING
        self.exit_code: Optional[int] = None
        self.created_at: datetime = datetime.now(timezone.utc)
        self.finished_at: Optional[datetime] = None
        self.logs: List[str] = []
        self.error: Optional[str] = None
        self.subscribers: Set[asyncio.Queue] = set()

    def to_response(self) -> JobResponse:
        return JobResponse(
            id=self.id,
            project_name=self.project_name,
            action=self.action,
            status=self.status,
            exit_code=self.exit_code,
            created_at=self.created_at.isoformat(),
            finished_at=self.finished_at.isoformat() if self.finished_at else None,
            logs=list(self.logs),
            error=self.error,
        )


class JobManager:
    def __init__(self):
        self._jobs: Dict[str, JobRecord] = {}

    def create_job(self, project_name: str, action: str) -> JobRecord:
        job_id = str(uuid.uuid4())
        record = JobRecord(job_id=job_id, project_name=project_name, action=action)
        self._jobs[job_id] = record
        return record

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        return self._jobs.get(job_id)

    def set_running(self, job_id: str) -> None:
        job = self.get_job(job_id)
        if job and job.status == JobStatus.PENDING:
            job.status = JobStatus.RUNNING
            self._notify_subscribers(job, JobStreamEvent(job_id=job.id, status=JobStatus.RUNNING))

    def append_log(self, job_id: str, line: str) -> None:
        job = self.get_job(job_id)
        if not job:
            return
        job.logs.append(line)
        event = JobStreamEvent(job_id=job.id, line=line, status=job.status)
        self._notify_subscribers(job, event)

    def complete_job(
        self,
        job_id: str,
        exit_code: int = 0,
        error: Optional[str] = None,
    ) -> None:
        job = self.get_job(job_id)
        if not job:
            return
        job.finished_at = datetime.now(timezone.utc)
        job.exit_code = exit_code
        if exit_code == 0 and not error:
            job.status = JobStatus.COMPLETED
        else:
            job.status = JobStatus.FAILED
            job.error = error or f"Exited with code {exit_code}"

        final_event = JobStreamEvent(
            job_id=job.id,
            status=job.status,
            exit_code=job.exit_code,
            line=f"Job {job.status.value}: {job.error}" if job.error else f"Job {job.status.value}",
        )
        self._notify_subscribers(job, final_event)

    def _notify_subscribers(self, job: JobRecord, event: JobStreamEvent) -> None:
        for q in list(job.subscribers):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("Subscriber queue is full for job %s", job.id)
            except Exception as e:
                logger.warning("Error pushing to subscriber: %s", e)

    async def stream_job_sse(self, job_id: str) -> AsyncGenerator[str, None]:
        job = self.get_job(job_id)
        if not job:
            yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
            return

        # 1. Replay historical buffered logs
        for line in job.logs:
            ev = JobStreamEvent(job_id=job.id, line=line, status=job.status)
            yield f"data: {ev.model_dump_json()}\n\n"

        # If already done, yield final status and finish
        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
            terminal_ev = JobStreamEvent(
                job_id=job.id,
                status=job.status,
                exit_code=job.exit_code,
                line=f"Job {job.status.value}",
            )
            yield f"data: {terminal_ev.model_dump_json()}\n\n"
            return

        # 2. Subscribe to live events
        queue: asyncio.Queue[JobStreamEvent] = asyncio.Queue(maxsize=1000)
        job.subscribers.add(queue)

        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {event.model_dump_json()}\n\n"
                    if event.status in (JobStatus.COMPLETED, JobStatus.FAILED):
                        break
                except asyncio.TimeoutError:
                    # Heartbeat
                    yield ": ping\n\n"
        finally:
            job.subscribers.discard(queue)


# Global singleton instance
job_manager = JobManager()


def get_job_manager() -> JobManager:
    return job_manager
