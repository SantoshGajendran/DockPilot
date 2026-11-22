import asyncio
from datetime import datetime, timedelta, timezone
import fnmatch
import logging
from typing import Any, Dict, List, Optional, Union
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.constants import AuditResult
from app.docker.interface import DockerGateway
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.jobs import JobResponse
from app.schemas.resources import (
    ImageItemResponse,
    ImagesListResponse,
    NetworkItemResponse,
    NetworksListResponse,
    PrunePreviewItem,
    PrunePreviewResponse,
    PruneResultResponse,
    ResourceInUseRef,
    VolumeItemResponse,
    VolumesListResponse,
)
from app.services.job_service import JobManager, get_job_manager

logger = logging.getLogger(__name__)

BUILTIN_NETWORKS = {"bridge", "host", "none"}


def matches_patterns(value: str, patterns: List[str]) -> bool:
    val = value.lower()
    for pattern in patterns:
        if fnmatch.fnmatchcase(val, pattern.lower()):
            return True
    return False


def is_resource_protected(identifiers: Union[str, List[str]], patterns: List[str]) -> bool:
    if isinstance(identifiers, str):
        identifiers = [identifiers]
    for ident in identifiers:
        if ident and matches_patterns(ident, patterns):
            return True
    return False


class PruneToken:
    def __init__(
        self,
        token: str,
        resource_type: str,
        items: List[Dict[str, Any]],
        space_reclaimed_bytes: int,
        expires_at: datetime,
    ):
        self.token = token
        self.resource_type = resource_type
        self.items = items
        self.space_reclaimed_bytes = space_reclaimed_bytes
        self.expires_at = expires_at

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at


_GLOBAL_PRUNE_TOKENS: Dict[str, PruneToken] = {}


class ResourceService:
    def __init__(
        self,
        docker_gateway: Optional[DockerGateway] = None,
        job_manager: Optional[JobManager] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings: Settings = settings or get_settings()
        self._docker_gateway = docker_gateway
        self.job_manager: JobManager = job_manager or get_job_manager()
        self._prune_tokens: Dict[str, PruneToken] = _GLOBAL_PRUNE_TOKENS


    @property
    def docker_gateway(self) -> DockerGateway:
        if self._docker_gateway is None:
            from app.api.deps import get_docker_gateway
            self._docker_gateway = get_docker_gateway()
        return self._docker_gateway

    async def _get_container_index(self) -> Dict[str, Any]:
        """Index containers for fast in-use detection across images, volumes, and networks."""
        containers = await self.docker_gateway.list_containers(all=True)
        image_index: Dict[str, List[ResourceInUseRef]] = {}
        volume_index: Dict[str, List[ResourceInUseRef]] = {}
        network_index: Dict[str, List[ResourceInUseRef]] = {}

        for c in containers:
            ref = ResourceInUseRef(
                id=c.get("id", ""),
                name=c.get("name", ""),
                state=c.get("state", ""),
            )

            # Images in-use
            img_tag = c.get("image", "")
            if img_tag:
                image_index.setdefault(img_tag, []).append(ref)
            img_id = c.get("image_id", "")
            if img_id:
                image_index.setdefault(img_id, []).append(ref)

            # Volumes in-use
            mounts = c.get("mounts", []) or []
            for m in mounts:
                if isinstance(m, dict) and m.get("Type") == "volume":
                    src = m.get("Source") or m.get("Name")
                    if src:
                        volume_index.setdefault(src, []).append(ref)

            # Networks in-use
            nets = c.get("networks", {}) or {}
            for net_name in nets.keys():
                network_index.setdefault(net_name, []).append(ref)

        return {
            "containers": containers,
            "images": image_index,
            "volumes": volume_index,
            "networks": network_index,
        }

    async def list_images(self) -> ImagesListResponse:
        index = await self._get_container_index()
        raw_images = await self.docker_gateway.list_images()

        items: List[ImageItemResponse] = []
        total_size = 0

        for img in raw_images:
            img_id = img.get("id", "")
            short_id = img.get("short_id", "")
            tags = img.get("tags", []) or []
            size = img.get("size", 0) or 0
            created = img.get("created", "")
            labels = img.get("labels", {}) or {}
            is_dangling = img.get("is_dangling", False) or len(tags) == 0 or tags == ["<none>:<none>"]

            # In-use detection
            in_use_refs: List[ResourceInUseRef] = []
            seen_cids = set()

            for t in tags:
                for ref in index["images"].get(t, []):
                    if ref.id not in seen_cids:
                        in_use_refs.append(ref)
                        seen_cids.add(ref.id)

            for ref in index["images"].get(img_id, []):
                if ref.id not in seen_cids:
                    in_use_refs.append(ref)
                    seen_cids.add(ref.id)

            if short_id:
                for ref in index["images"].get(short_id, []):
                    if ref.id not in seen_cids:
                        in_use_refs.append(ref)
                        seen_cids.add(ref.id)

            is_in_use = len(in_use_refs) > 0

            # Protected detection
            check_ids = tags + [img_id, short_id]
            is_protected = is_resource_protected(check_ids, self.settings.protected_images)

            items.append(
                ImageItemResponse(
                    id=img_id,
                    short_id=short_id,
                    tags=tags,
                    size=size,
                    created=created,
                    labels=labels,
                    is_dangling=is_dangling,
                    is_in_use=is_in_use,
                    in_use_by=in_use_refs,
                    is_protected=is_protected,
                )
            )
            total_size += size

        return ImagesListResponse(
            images=items,
            total_size=total_size,
            total_count=len(items),
        )

    async def list_volumes(self) -> VolumesListResponse:
        index = await self._get_container_index()
        raw_volumes = await self.docker_gateway.list_volumes()

        items: List[VolumeItemResponse] = []

        for vol in raw_volumes:
            name = vol.get("name", "")
            driver = vol.get("driver", "local")
            mountpoint = vol.get("mountpoint", "")
            created = vol.get("created", "")
            labels = vol.get("labels", {}) or {}
            size = vol.get("size")

            in_use_refs = index["volumes"].get(name, [])
            is_in_use = len(in_use_refs) > 0
            is_protected = is_resource_protected(name, self.settings.protected_volumes)

            items.append(
                VolumeItemResponse(
                    name=name,
                    driver=driver,
                    mountpoint=mountpoint,
                    created=created,
                    labels=labels,
                    size=size,
                    is_in_use=is_in_use,
                    in_use_by=in_use_refs,
                    is_protected=is_protected,
                )
            )

        return VolumesListResponse(
            volumes=items,
            total_count=len(items),
        )

    async def list_networks(self) -> NetworksListResponse:
        index = await self._get_container_index()
        raw_networks = await self.docker_gateway.list_networks()

        items: List[NetworkItemResponse] = []

        for net in raw_networks:
            net_id = net.get("id", "")
            short_id = net.get("short_id", "")
            name = net.get("name", "")
            driver = net.get("driver", "")
            scope = net.get("scope", "local")
            internal = net.get("internal", False)
            created = net.get("created", "")
            labels = net.get("labels", {}) or {}
            connected_ids = net.get("connected_container_ids", []) or []

            in_use_refs: List[ResourceInUseRef] = list(index["networks"].get(name, []))
            seen_cids = {r.id for r in in_use_refs}

            for cid in connected_ids:
                if cid not in seen_cids:
                    # Look up container in index
                    for c in index["containers"]:
                        if c.get("id") == cid:
                            in_use_refs.append(
                                ResourceInUseRef(
                                    id=c.get("id", cid),
                                    name=c.get("name", cid),
                                    state=c.get("state", "unknown"),
                                )
                            )
                            seen_cids.add(cid)
                            break

            is_in_use = len(in_use_refs) > 0
            is_built_in = name in BUILTIN_NETWORKS
            is_protected = is_built_in or is_resource_protected(name, self.settings.protected_networks)

            items.append(
                NetworkItemResponse(
                    id=net_id,
                    short_id=short_id,
                    name=name,
                    driver=driver,
                    scope=scope,
                    internal=internal,
                    created=created,
                    labels=labels,
                    connected_container_ids=connected_ids,
                    is_in_use=is_in_use,
                    in_use_by=in_use_refs,
                    is_built_in=is_built_in,
                    is_protected=is_protected,
                )
            )

        return NetworksListResponse(
            networks=items,
            total_count=len(items),
        )

    async def remove_image(
        self,
        image_id: str,
        current_user: User,
        ip: Optional[str],
        db: AsyncSession,
    ) -> bool:
        images_res = await self.list_images()
        target = None
        for img in images_res.images:
            if img.id == image_id or img.short_id == image_id or image_id in img.tags:
                target = img
                break

        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image '{image_id}' not found.",
            )

        if target.is_protected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image '{image_id}' matches protected resources configuration and cannot be removed.",
            )

        if target.is_in_use:
            cnames = ", ".join(c.name for c in target.in_use_by)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Image '{image_id}' is currently in use by container(s): {cnames}.",
            )

        audit = AuditLog(
            user_id=current_user.id if isinstance(current_user.id, uuid.UUID) else None,
            username=current_user.username,
            action="image_delete",
            target_type="image",
            target_id=image_id,
            payload={"tags": target.tags, "size": target.size},
            result=AuditResult.PENDING,
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(audit)

        try:
            await self.docker_gateway.remove_image(image_id)
            audit.result = AuditResult.SUCCESS
            await db.commit()
            return True
        except Exception as e:
            audit.result = AuditResult.FAILED
            audit.error_message = str(e)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove image: {e}",
            )

    async def remove_volume(
        self,
        volume_name: str,
        current_user: User,
        ip: Optional[str],
        db: AsyncSession,
    ) -> bool:
        volumes_res = await self.list_volumes()
        target = None
        for vol in volumes_res.volumes:
            if vol.name == volume_name:
                target = vol
                break

        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Volume '{volume_name}' not found.",
            )

        if target.is_protected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Volume '{volume_name}' matches protected resources configuration and cannot be removed.",
            )

        if target.is_in_use:
            cnames = ", ".join(c.name for c in target.in_use_by)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Volume '{volume_name}' is currently in use by container(s): {cnames}.",
            )

        audit = AuditLog(
            user_id=current_user.id if isinstance(current_user.id, uuid.UUID) else None,
            username=current_user.username,
            action="volume_delete",
            target_type="volume",
            target_id=volume_name,
            payload={"driver": target.driver, "size": target.size},
            result=AuditResult.PENDING,
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(audit)

        try:
            await self.docker_gateway.remove_volume(volume_name)
            audit.result = AuditResult.SUCCESS
            await db.commit()
            return True
        except Exception as e:
            audit.result = AuditResult.FAILED
            audit.error_message = str(e)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove volume: {e}",
            )

    async def remove_network(
        self,
        network_id: str,
        current_user: User,
        ip: Optional[str],
        db: AsyncSession,
    ) -> bool:
        networks_res = await self.list_networks()
        target = None
        for net in networks_res.networks:
            if net.id == network_id or net.short_id == network_id or net.name == network_id:
                target = net
                break

        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Network '{network_id}' not found.",
            )

        if target.is_built_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Network '{target.name}' is a built-in Docker system network and cannot be removed.",
            )

        if target.is_protected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Network '{target.name}' matches protected resources configuration and cannot be removed.",
            )

        if target.is_in_use:
            cnames = ", ".join(c.name for c in target.in_use_by)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Network '{target.name}' is currently in use by container(s): {cnames}.",
            )

        audit = AuditLog(
            user_id=current_user.id if isinstance(current_user.id, uuid.UUID) else None,
            username=current_user.username,
            action="network_delete",
            target_type="network",
            target_id=target.name,
            payload={"id": target.id, "driver": target.driver},
            result=AuditResult.PENDING,
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(audit)

        try:
            await self.docker_gateway.remove_network(target.id)
            audit.result = AuditResult.SUCCESS
            await db.commit()
            return True
        except Exception as e:
            audit.result = AuditResult.FAILED
            audit.error_message = str(e)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove network: {e}",
            )

    async def preview_prune_images(self) -> PrunePreviewResponse:
        images_res = await self.list_images()
        items: List[PrunePreviewItem] = []
        total_space = 0

        for img in images_res.images:
            if img.is_dangling and not img.is_protected and not img.is_in_use:
                tag_label = img.tags[0] if img.tags else "<none>"
                items.append(
                    PrunePreviewItem(
                        id=img.id,
                        name=tag_label,
                        size=img.size,
                        details=f"Dangling image ({img.short_id})",
                    )
                )
                total_space += img.size

        token_str = uuid.uuid4().hex
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self.settings.prune_token_expire_seconds)
        self._prune_tokens[token_str] = PruneToken(
            token=token_str,
            resource_type="images",
            items=[{"id": it.id, "name": it.name, "size": it.size} for it in items],
            space_reclaimed_bytes=total_space,
            expires_at=expires_at,
        )

        return PrunePreviewResponse(
            resource_type="images",
            items_count=len(items),
            space_reclaimed_bytes=total_space,
            items=items,
            confirmation_token=token_str,
            expires_at=expires_at.isoformat(),
        )

    async def preview_prune_volumes(self) -> PrunePreviewResponse:
        volumes_res = await self.list_volumes()
        items: List[PrunePreviewItem] = []
        total_space = 0

        for vol in volumes_res.volumes:
            if not vol.is_in_use and not vol.is_protected:
                size_val = vol.size or 0
                items.append(
                    PrunePreviewItem(
                        id=vol.name,
                        name=vol.name,
                        size=size_val,
                        details=f"Unused volume (driver: {vol.driver})",
                    )
                )
                total_space += size_val

        token_str = uuid.uuid4().hex
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self.settings.prune_token_expire_seconds)
        self._prune_tokens[token_str] = PruneToken(
            token=token_str,
            resource_type="volumes",
            items=[{"id": it.id, "name": it.name, "size": it.size} for it in items],
            space_reclaimed_bytes=total_space,
            expires_at=expires_at,
        )

        return PrunePreviewResponse(
            resource_type="volumes",
            items_count=len(items),
            space_reclaimed_bytes=total_space,
            items=items,
            confirmation_token=token_str,
            expires_at=expires_at.isoformat(),
        )

    async def preview_prune_networks(self) -> PrunePreviewResponse:
        networks_res = await self.list_networks()
        items: List[PrunePreviewItem] = []

        for net in networks_res.networks:
            if not net.is_in_use and not net.is_protected and not net.is_built_in:
                items.append(
                    PrunePreviewItem(
                        id=net.id,
                        name=net.name,
                        size=0,
                        details=f"Unused network (driver: {net.driver}, scope: {net.scope})",
                    )
                )

        token_str = uuid.uuid4().hex
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self.settings.prune_token_expire_seconds)
        self._prune_tokens[token_str] = PruneToken(
            token=token_str,
            resource_type="networks",
            items=[{"id": it.id, "name": it.name, "size": 0} for it in items],
            space_reclaimed_bytes=0,
            expires_at=expires_at,
        )

        return PrunePreviewResponse(
            resource_type="networks",
            items_count=len(items),
            space_reclaimed_bytes=0,
            items=items,
            confirmation_token=token_str,
            expires_at=expires_at.isoformat(),
        )

    async def confirm_prune(
        self,
        resource_type: str,
        confirmation_token: str,
        current_user: User,
        ip: Optional[str],
        db: AsyncSession,
    ) -> PruneResultResponse:
        token_obj = self._prune_tokens.pop(confirmation_token, None)
        if not token_obj or token_obj.resource_type != resource_type or token_obj.is_expired():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired prune confirmation token.",
            )

        audit = AuditLog(
            user_id=current_user.id if isinstance(current_user.id, uuid.UUID) else None,
            username=current_user.username,
            action=f"{resource_type}_prune",
            target_type="resource_prune",
            target_id=resource_type,
            payload={
                "preview_items_count": len(token_obj.items),
                "expected_space_reclaimed": token_obj.space_reclaimed_bytes,
            },
            result=AuditResult.PENDING,
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(audit)

        try:
            if resource_type == "images":
                res = await self.docker_gateway.prune_images(dangling_only=True)
            elif resource_type == "volumes":
                res = await self.docker_gateway.prune_volumes()
            elif resource_type == "networks":
                res = await self.docker_gateway.prune_networks()
            else:
                raise ValueError(f"Unknown resource type: {resource_type}")

            items_deleted = res.get("items_deleted", []) or []
            space_reclaimed = res.get("space_reclaimed", 0) or 0

            audit.result = AuditResult.SUCCESS
            audit.payload = {
                "items_deleted": items_deleted,
                "space_reclaimed": space_reclaimed,
            }
            await db.commit()

            return PruneResultResponse(
                resource_type=resource_type,
                items_deleted=items_deleted,
                space_reclaimed_bytes=space_reclaimed,
            )
        except Exception as e:
            audit.result = AuditResult.FAILED
            audit.error_message = str(e)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to prune {resource_type}: {e}",
            )

    async def start_pull_image(
        self,
        image_name: str,
        current_user: User,
        ip: Optional[str],
        db: AsyncSession,
    ) -> JobResponse:
        clean_name = image_name.strip()
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image name cannot be empty.",
            )

        audit = AuditLog(
            user_id=current_user.id if isinstance(current_user.id, uuid.UUID) else None,
            username=current_user.username,
            action="image_pull",
            target_type="image",
            target_id=clean_name,
            payload={"image_name": clean_name},
            result=AuditResult.PENDING,
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(audit)

        job = self.job_manager.create_job(project_name=clean_name, action="pull")
        job_id = job.id
        audit_id = audit.id

        async def _run_pull():
            self.job_manager.set_running(job_id)
            self.job_manager.append_log(job_id, f"Initiating pull for {clean_name}...")
            try:
                async for line in self.docker_gateway.pull_image(clean_name):
                    self.job_manager.append_log(job_id, line)
                self.job_manager.complete_job(job_id, exit_code=0)

                # Update audit log
                from app.core.database import async_session
                async with async_session() as session:
                    audit_record = await session.get(AuditLog, audit_id)
                    if audit_record:
                        audit_record.result = AuditResult.SUCCESS
                        await session.commit()
            except Exception as e:
                logger.error("Error pulling image %s: %s", clean_name, e)
                self.job_manager.append_log(job_id, f"Error: {e}")
                self.job_manager.complete_job(job_id, exit_code=1, error=str(e))

                from app.core.database import async_session
                async with async_session() as session:
                    audit_record = await session.get(AuditLog, audit_id)
                    if audit_record:
                        audit_record.result = AuditResult.FAILED
                        audit_record.error_message = str(e)
                        await session.commit()

        asyncio.create_task(_run_pull())
        return job.to_response()
