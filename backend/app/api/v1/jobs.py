from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.deps import require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.jobs import JobResponse
from app.services.job_service import JobManager, get_job_manager

router = APIRouter()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(
    job_id: str,
    user: User = Depends(require_role(Role.VIEWER)),
    job_mgr: JobManager = Depends(get_job_manager),
) -> JobResponse:
    job = job_mgr.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found",
        )
    return job.to_response()


@router.get("/{job_id}/stream")
async def stream_job_output(
    job_id: str,
    user: User = Depends(require_role(Role.VIEWER)),
    job_mgr: JobManager = Depends(get_job_manager),
) -> StreamingResponse:
    job = job_mgr.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found",
        )

    generator = job_mgr.stream_job_sse(job_id)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
