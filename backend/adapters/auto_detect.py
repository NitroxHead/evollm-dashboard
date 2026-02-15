"""Auto-detect frameworks and discover experiments in the scan directory.

Delegates to the project registry for all detection and discovery logic.
Kept for backward compatibility.
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


def detect_framework(path: str) -> Optional[str]:
    """Detect which framework a given path belongs to.

    Returns the framework name as a string, or None.
    """
    from backend.adapters.registry import registry
    return registry.detect_framework(path)


def discover_experiments(base_dir: str) -> List[Tuple[str, str]]:
    """Scan base_dir for all experiment directories / SQLite files.

    Returns list of (path, framework_name) tuples.
    """
    from backend.adapters.registry import registry
    return registry.discover_experiments(base_dir)
