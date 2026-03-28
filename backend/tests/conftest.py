import sys
from pathlib import Path

# Ensure imports resolve when pytest runs from repo root or backend/
_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))
