from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ResourceInUseRef(BaseModel):
    id: str
    name: str
    state: str


class ImageItemResponse(BaseModel):
    id: str
    short_id: str
    tags: List[str] = Field(default_factory=list)
    size: int = 0
    created: str = ""
    labels: Dict[str, str] = Field(default_factory=dict)
    is_dangling: bool = False
    is_in_use: bool = False
    in_use_by: List[ResourceInUseRef] = Field(default_factory=list)
    is_protected: bool = False


class ImagesListResponse(BaseModel):
    images: List[ImageItemResponse] = Field(default_factory=list)
    total_size: int = 0
    total_count: int = 0


class VolumeItemResponse(BaseModel):
    name: str
    driver: str = "local"
    mountpoint: str = ""
    created: str = ""
    labels: Dict[str, str] = Field(default_factory=dict)
    size: Optional[int] = None
    is_in_use: bool = False
    in_use_by: List[ResourceInUseRef] = Field(default_factory=list)
    is_protected: bool = False


class VolumesListResponse(BaseModel):
    volumes: List[VolumeItemResponse] = Field(default_factory=list)
    total_count: int = 0


class NetworkItemResponse(BaseModel):
    id: str
    short_id: str
    name: str
    driver: str = ""
    scope: str = "local"
    internal: bool = False
    created: str = ""
    labels: Dict[str, str] = Field(default_factory=dict)
    connected_container_ids: List[str] = Field(default_factory=list)
    is_in_use: bool = False
    in_use_by: List[ResourceInUseRef] = Field(default_factory=list)
    is_built_in: bool = False
    is_protected: bool = False


class NetworksListResponse(BaseModel):
    networks: List[NetworkItemResponse] = Field(default_factory=list)
    total_count: int = 0


class PrunePreviewItem(BaseModel):
    id: str
    name: str
    size: int = 0
    details: Optional[str] = None


class PrunePreviewResponse(BaseModel):
    resource_type: str
    items_count: int
    space_reclaimed_bytes: int
    items: List[PrunePreviewItem] = Field(default_factory=list)
    confirmation_token: str
    expires_at: str


class PruneConfirmRequest(BaseModel):
    confirmation_token: str


class PruneResultResponse(BaseModel):
    resource_type: str
    items_deleted: List[str] = Field(default_factory=list)
    space_reclaimed_bytes: int = 0


class PullImageRequest(BaseModel):
    image_name: str
