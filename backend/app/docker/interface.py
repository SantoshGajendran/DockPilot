from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional, Union


class DockerGateway(ABC):
    @abstractmethod
    async def ping(self) -> bool:
        """Check if Docker daemon is responsive."""
        pass

    @abstractmethod
    async def list_containers(self, all: bool = True) -> List[Dict[str, Any]]:
        """List containers."""
        pass

    @abstractmethod
    async def inspect_container(self, container_id: str) -> Dict[str, Any]:
        """Inspect container details."""
        pass

    @abstractmethod
    async def execute_action(self, container_id: str, action: str) -> bool:
        """Execute a lifecycle action on a container."""
        pass

    @abstractmethod
    async def remove_container(self, container_id: str, force: bool = False) -> bool:
        """Remove a container."""
        pass

    @abstractmethod
    async def stream_events(
        self, since: Optional[Union[int, datetime]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream Docker events."""
        pass

    @abstractmethod
    async def get_container_stats(self, container_id: str) -> Dict[str, Any]:
        """Get live resource stats for a container."""
        pass

    @abstractmethod
    async def get_recent_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve the most recent Docker lifecycle events."""
        pass

    @abstractmethod
    async def get_container_logs(
        self,
        container_id: str,
        tail: int = 200,
        since: Optional[int] = None,
        until: Optional[int] = None,
        timestamps: bool = True,
    ) -> List[Dict[str, Any]]:
        """Fetch historical log lines for a container."""
        pass

    @abstractmethod
    async def stream_container_logs(
        self,
        container_id: str,
        tail: int = 100,
        since: Optional[int] = None,
        timestamps: bool = True,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream real-time log lines for a container."""
        pass

    @abstractmethod
    async def get_docker_info(self) -> Dict[str, Any]:
        """Return Docker daemon version, storage driver, and root dir."""
        pass

    @abstractmethod
    async def get_docker_disk_usage(self) -> Dict[str, Any]:
        """Return disk space usage breakdown (images, containers, volumes, build cache)."""
        pass

    @abstractmethod
    async def execute_compose_action(
        self,
        project_name: str,
        action: str,
        working_dir: Optional[str] = None,
        config_files: Optional[List[str]] = None,
    ) -> AsyncGenerator[str, None]:
        """Execute a compose lifecycle action and stream output lines."""
        pass

    @abstractmethod
    async def list_images(self) -> List[Dict[str, Any]]:
        """List Docker images with metadata and usage information."""
        pass

    @abstractmethod
    async def list_volumes(self) -> List[Dict[str, Any]]:
        """List Docker volumes with metadata and driver info."""
        pass

    @abstractmethod
    async def list_networks(self) -> List[Dict[str, Any]]:
        """List Docker networks with scope, driver, and connected containers."""
        pass

    @abstractmethod
    async def pull_image(self, image_name: str) -> AsyncGenerator[str, None]:
        """Pull an image from registry, streaming progress status lines."""
        pass

    @abstractmethod
    async def remove_image(self, image_id: str, force: bool = False) -> bool:
        """Remove a Docker image by ID or tag."""
        pass

    @abstractmethod
    async def remove_volume(self, volume_name: str, force: bool = False) -> bool:
        """Remove a Docker volume by name."""
        pass

    @abstractmethod
    async def remove_network(self, network_id: str) -> bool:
        """Remove a Docker network by ID or name."""
        pass

    @abstractmethod
    async def prune_images(self, dangling_only: bool = True) -> Dict[str, Any]:
        """Prune dangling or unused Docker images."""
        pass

    @abstractmethod
    async def prune_volumes(self) -> Dict[str, Any]:
        """Prune unused Docker volumes."""
        pass

    @abstractmethod
    async def prune_networks(self) -> Dict[str, Any]:
        """Prune unused Docker networks."""
        pass

    @abstractmethod
    async def create_exec(
        self,
        container_id: str,
        cmd: List[str],
        tty: bool = True,
        stdin: bool = True,
        privileged: bool = False,
        user: Optional[str] = None,
    ) -> str:
        """Create an exec instance inside a container and return exec_id."""
        pass

    @abstractmethod
    async def start_exec(self, exec_id: str, tty: bool = True) -> Any:
        """Start an exec instance with attached socket."""
        pass

    @abstractmethod
    async def resize_exec(self, exec_id: str, height: int, width: int) -> None:
        """Resize TTY dimensions for an active exec instance."""
        pass



