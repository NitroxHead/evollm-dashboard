"""ShinkaEvolve project config for the EvoLLM Dashboard."""

import os

from backend.adapters.shinka_adapter import ShinkaAdapter


def _detect_shinkaevolve(path: str) -> bool:
    """Detect if a path is a ShinkaEvolve SQLite database."""
    if not os.path.isfile(path):
        return False
    ext = os.path.splitext(path)[1].lower()
    return ext in (".sqlite", ".db")


PROJECT_CONFIG = {
    "name": "shinkaevolve",
    "adapter_class": ShinkaAdapter,
    "detect": _detect_shinkaevolve,
    "glob_patterns": ["**/*.sqlite", "**/*.db"],
    "display_name": "ShinkaEvolve",
    "description": "ShinkaEvolve SQLite evolution framework",
    "badge_color": "#4ade80",
    "badge_bg": "rgba(34, 197, 94, 0.15)",
    "change_detection": "poll",
}
