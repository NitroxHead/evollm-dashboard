"""Experiment registry — discovers and manages experiments."""

from __future__ import annotations

import logging
import threading
import time
from typing import Dict, Optional

from backend.adapters.auto_detect import discover_experiments
from backend.adapters.base import FrameworkAdapter
from backend.adapters.openevolve_adapter import OpenEvolveAdapter
from backend.adapters.shinka_adapter import ShinkaAdapter
from backend.config import BASE_DIR, SCAN_INTERVAL
from backend.models.unified import Framework, UnifiedExperiment

logger = logging.getLogger(__name__)


class ExperimentManager:
    """Singleton registry that discovers and caches experiment adapters."""

    def __init__(self):
        self._adapters: Dict[str, FrameworkAdapter] = {}
        self._experiments: Dict[str, UnifiedExperiment] = {}
        self._lock = threading.Lock()
        self._scan_thread: Optional[threading.Thread] = None
        self._running = False

    def start(self):
        """Start periodic scanning."""
        self._running = True
        self.scan()
        self._scan_thread = threading.Thread(target=self._scan_loop, daemon=True)
        self._scan_thread.start()

    def stop(self):
        self._running = False

    def scan(self):
        """Discover experiments in BASE_DIR."""
        discovered = discover_experiments(str(BASE_DIR))
        with self._lock:
            for path, framework in discovered:
                adapter = self._create_adapter(path, framework)
                if adapter is None:
                    continue
                try:
                    info = adapter.get_experiment_info()
                    self._adapters[info.id] = adapter
                    self._experiments[info.id] = info
                    logger.info(f"Registered experiment: {info.id} ({info.framework.value})")
                except Exception as e:
                    logger.warning(f"Failed to load experiment at {path}: {e}")

    def _scan_loop(self):
        while self._running:
            time.sleep(SCAN_INTERVAL)
            try:
                self.scan()
            except Exception as e:
                logger.error(f"Scan error: {e}")

    def _create_adapter(self, path: str, framework: Framework) -> Optional[FrameworkAdapter]:
        if framework == Framework.OPENEVOLVE:
            return OpenEvolveAdapter(path)
        elif framework == Framework.SHINKAEVOLVE:
            return ShinkaAdapter(path)
        return None

    # ── public API ──────────────────────────────────────────────────

    def list_experiments(self) -> list[UnifiedExperiment]:
        with self._lock:
            # Refresh status for each
            results = []
            for eid, adapter in self._adapters.items():
                try:
                    info = adapter.get_experiment_info()
                    self._experiments[eid] = info
                    results.append(info)
                except Exception:
                    if eid in self._experiments:
                        results.append(self._experiments[eid])
            return results

    def get_experiment(self, experiment_id: str) -> Optional[UnifiedExperiment]:
        with self._lock:
            adapter = self._adapters.get(experiment_id)
            if adapter:
                try:
                    info = adapter.get_experiment_info()
                    self._experiments[experiment_id] = info
                    return info
                except Exception:
                    return self._experiments.get(experiment_id)
            return None

    def get_adapter(self, experiment_id: str) -> Optional[FrameworkAdapter]:
        with self._lock:
            return self._adapters.get(experiment_id)

    def get_all_adapters(self) -> Dict[str, FrameworkAdapter]:
        with self._lock:
            return dict(self._adapters)


# Singleton
manager = ExperimentManager()
