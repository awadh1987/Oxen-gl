"""OxenGL Backend Entrypoint Bridge."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
app_root = backend_dir.parent
for p in [str(backend_dir), str(app_root)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app  # noqa: F401,E402
from backend.api.routes.hrms_ledger import router as hrms_ledger_router  # noqa: F401,E402

__all__ = ["app", "hrms_ledger_router"]
