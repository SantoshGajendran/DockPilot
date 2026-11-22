from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Tuple


class BaseNotifier(ABC):
    @abstractmethod
    async def send(
        self,
        title: str,
        message: str,
        severity: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, Optional[str]]:
        """Send notification. Returns (success, error_message)."""
        pass
