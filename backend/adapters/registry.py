"""Project config registry — discovers and manages framework adapters via config files and entry points."""

from __future__ import annotations

import glob
import importlib
import importlib.util
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Type

from backend.adapters.base import FrameworkAdapter

logger = logging.getLogger(__name__)


@dataclass
class ProjectConfig:
    name: str
    adapter_class: Type[FrameworkAdapter]
    detect: Callable[[str], bool]
    glob_patterns: List[str]
    resolve_experiment_path: Optional[Callable[[str], str]] = None
    display_name: Optional[str] = None
    description: str = ""
    badge_color: str = "#6366f1"
    badge_bg: str = "rgba(99, 102, 241, 0.15)"
    change_detection: str = "poll"  # "poll" or "watchdog"


class ProjectRegistry:
    """Central registry for all project configs."""

    def __init__(self):
        self._configs: Dict[str, ProjectConfig] = {}

    def register(self, config: ProjectConfig):
        self._configs[config.name] = config
        logger.info(f"Registered project config: {config.name}")

    def get(self, name: str) -> Optional[ProjectConfig]:
        return self._configs.get(name)

    def all_configs(self) -> Dict[str, ProjectConfig]:
        return dict(self._configs)

    def detect_framework(self, path: str) -> Optional[str]:
        """Return the framework name that matches the given path, or None."""
        for name, config in self._configs.items():
            try:
                if config.detect(path):
                    return name
            except Exception:
                continue
        return None

    def create_adapter(self, path: str, name: str) -> Optional[FrameworkAdapter]:
        """Create an adapter instance for the given framework name and path."""
        config = self._configs.get(name)
        if config is None:
            return None
        return config.adapter_class(path)

    def discover_experiments(self, base_dir: str) -> List[Tuple[str, str]]:
        """Scan base_dir using all registered configs' glob patterns.

        Returns list of (path, framework_name) tuples.
        """
        results: List[Tuple[str, str]] = []
        seen_paths: set = set()

        for name, config in self._configs.items():
            for pattern in config.glob_patterns:
                for match_path in glob.iglob(os.path.join(base_dir, pattern), recursive=True):
                    # Resolve experiment path if a resolver is provided
                    if config.resolve_experiment_path:
                        try:
                            experiment_path = config.resolve_experiment_path(match_path)
                        except Exception:
                            continue
                    else:
                        experiment_path = match_path

                    real = os.path.realpath(experiment_path)
                    if real in seen_paths:
                        continue

                    # Confirm with detect()
                    try:
                        if config.detect(experiment_path):
                            seen_paths.add(real)
                            results.append((experiment_path, name))
                            logger.debug(f"Discovered {name} experiment: {experiment_path}")
                    except Exception:
                        continue

        return results

    def get_framework_metadata(self) -> List[Dict[str, Any]]:
        """Return metadata for all registered frameworks (for the frontend)."""
        return [
            {
                "name": c.name,
                "display_name": c.display_name or c.name,
                "description": c.description,
                "badge_color": c.badge_color,
                "badge_bg": c.badge_bg,
                "change_detection": c.change_detection,
            }
            for c in self._configs.values()
        ]

    # ── Loading ───────────────────────────────────────────────────────

    def load_directory_configs(self, directory: str):
        """Load all PROJECT_CONFIG dicts from .py files in a directory."""
        dirpath = Path(directory)
        if not dirpath.is_dir():
            logger.debug(f"Project config directory not found: {directory}")
            return

        for py_file in sorted(dirpath.glob("*.py")):
            if py_file.name.startswith("_"):
                continue
            try:
                spec = importlib.util.spec_from_file_location(
                    f"evollm_project_{py_file.stem}", str(py_file)
                )
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                cfg_dict = getattr(mod, "PROJECT_CONFIG", None)
                if cfg_dict and isinstance(cfg_dict, dict):
                    self.register(ProjectConfig(**cfg_dict))
                else:
                    logger.debug(f"No PROJECT_CONFIG in {py_file}")
            except Exception as e:
                logger.warning(f"Failed to load project config {py_file}: {e}")

    def load_entry_point_configs(self):
        """Load configs from installed packages via entry points."""
        try:
            from importlib.metadata import entry_points
            eps = entry_points()
            # Python 3.12+ returns a SelectableGroups, older returns dict
            if hasattr(eps, "select"):
                group = eps.select(group="evollm.projects")
            else:
                group = eps.get("evollm.projects", [])

            for ep in group:
                try:
                    mod = ep.load()
                    cfg_dict = getattr(mod, "PROJECT_CONFIG", None)
                    if cfg_dict and isinstance(cfg_dict, dict):
                        self.register(ProjectConfig(**cfg_dict))
                except Exception as e:
                    logger.warning(f"Failed to load entry point {ep.name}: {e}")
        except Exception as e:
            logger.debug(f"Entry point loading skipped: {e}")

    def load_all(self, projects_dir: Optional[str] = None):
        """Load from entry points and config directory."""
        self.load_entry_point_configs()
        if projects_dir:
            self.load_directory_configs(projects_dir)


# Module-level singleton
registry = ProjectRegistry()
