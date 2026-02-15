"""OpenEvolve project config for the EvoLLM Dashboard."""

import os

from backend.adapters.openevolve_adapter import OpenEvolveAdapter


def _detect_openevolve(path: str) -> bool:
    """Detect if a path is an OpenEvolve experiment."""
    if os.path.isfile(path):
        return False

    if not os.path.isdir(path):
        return False

    # Check if it IS a checkpoint dir
    if os.path.basename(path).startswith("checkpoint_"):
        meta = os.path.join(path, "metadata.json")
        if os.path.exists(meta):
            return True

    # Check if it contains checkpoint dirs
    try:
        for entry in os.listdir(path):
            sub = os.path.join(path, entry)
            if os.path.isdir(sub) and entry.startswith("checkpoint_"):
                meta = os.path.join(sub, "metadata.json")
                if os.path.exists(meta):
                    return True
    except OSError:
        pass

    # Recurse one level into checkpoints/
    checkpoints_dir = os.path.join(path, "checkpoints")
    if os.path.isdir(checkpoints_dir):
        try:
            for entry in os.listdir(checkpoints_dir):
                sub = os.path.join(checkpoints_dir, entry)
                if os.path.isdir(sub) and entry.startswith("checkpoint_"):
                    meta = os.path.join(sub, "metadata.json")
                    if os.path.exists(meta):
                        return True
        except OSError:
            pass

    return False


def _resolve_openevolve_path(match_path: str) -> str:
    """Resolve a glob match (checkpoint_*/metadata.json) to the experiment root."""
    # match_path is like .../checkpoint_N/metadata.json
    checkpoint_dir = os.path.dirname(match_path)
    checkpoints_parent = os.path.dirname(checkpoint_dir)
    if os.path.basename(checkpoints_parent) == "checkpoints":
        return os.path.dirname(checkpoints_parent)
    return checkpoints_parent


PROJECT_CONFIG = {
    "name": "openevolve",
    "adapter_class": OpenEvolveAdapter,
    "detect": _detect_openevolve,
    "glob_patterns": ["**/checkpoint_*/metadata.json"],
    "resolve_experiment_path": _resolve_openevolve_path,
    "display_name": "OpenEvolve",
    "description": "OpenEvolve JSON-checkpoint evolution framework",
    "badge_color": "#818cf8",
    "badge_bg": "rgba(99, 102, 241, 0.15)",
    "change_detection": "watchdog",
}
