from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List

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
    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream Docker events."""
        pass
