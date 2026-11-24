import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import app.models  # noqa: F401 - ensure all models are registered on Base.metadata
