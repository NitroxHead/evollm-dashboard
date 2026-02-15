"""Change detection engine — watchdog for filesystem + SQLite mtime polling.

Broadcasts events to WebSocket subscribers when experiments change.
"""

from __future__ import annotations

import asyncio
import logging
import os
import threading
import time
from typing import Callable, Dict, List, Optional, Set

from backend.config import FS_DEBOUNCE, SQLITE_POLL_INTERVAL
from backend.models.unified import EventType, Framework, UnifiedEvent

logger = logging.getLogger(__name__)

# Optional watchdog import
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileSystemEvent
    HAS_WATCHDOG = True
except ImportError:
    HAS_WATCHDOG = False
    logger.info("watchdog not installed — falling back to polling for all experiments")


class ChangeDetectionEngine:
    """Monitors experiments for changes and fires callbacks."""

    def __init__(self):
        self._callbacks: List[Callable] = []
        self._running = False
        self._poll_thread: Optional[threading.Thread] = None
        self._observer = None  # watchdog Observer
        self._watched_paths: Set[str] = set()
        self._last_mtimes: Dict[str, float] = {}
        self._experiment_meta: Dict[str, Dict] = {}  # experiment_id -> {path, framework}
        self._debounce_timers: Dict[str, float] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def on_change(self, callback: Callable):
        """Register a callback(event: UnifiedEvent) for changes."""
        self._callbacks.append(callback)

    def register_experiment(self, experiment_id: str, path: str, framework: Framework):
        self._experiment_meta[experiment_id] = {"path": path, "framework": framework}
        if framework == Framework.OPENEVOLVE and HAS_WATCHDOG:
            self._setup_watchdog(experiment_id, path)
        # SQLite experiments are polled

    def start(self):
        self._running = True
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()
        if HAS_WATCHDOG and self._observer is None:
            self._observer = Observer()
            self._observer.start()

    def stop(self):
        self._running = False
        if self._observer:
            self._observer.stop()
            self._observer.join()

    # ── internals ───────────────────────────────────────────────────

    def _setup_watchdog(self, experiment_id: str, path: str):
        if not HAS_WATCHDOG or not self._observer:
            return
        if path in self._watched_paths:
            return
        self._watched_paths.add(path)

        handler = _WatchdogHandler(self, experiment_id)
        try:
            self._observer.schedule(handler, path, recursive=True)
            logger.debug(f"Watchdog watching: {path}")
        except Exception as e:
            logger.warning(f"Failed to watch {path}: {e}")

    def _poll_loop(self):
        """Poll SQLite files for mtime changes."""
        while self._running:
            for eid, meta in list(self._experiment_meta.items()):
                if meta["framework"] != Framework.SHINKAEVOLVE:
                    continue
                path = meta["path"]
                try:
                    mtime = os.path.getmtime(path) if os.path.exists(path) else 0
                    prev = self._last_mtimes.get(eid, 0)
                    if mtime > prev:
                        self._last_mtimes[eid] = mtime
                        if prev > 0:  # skip first detection
                            self._fire_event(UnifiedEvent(
                                type=EventType.NEW_PROGRAM,
                                experiment_id=eid,
                                timestamp=time.time(),
                                data={"source": "sqlite_poll"},
                            ))
                except Exception as e:
                    logger.debug(f"Poll error for {eid}: {e}")

            time.sleep(SQLITE_POLL_INTERVAL)

    def _fire_event(self, event: UnifiedEvent):
        # Debounce
        now = time.time()
        key = f"{event.experiment_id}:{event.type.value}"
        last = self._debounce_timers.get(key, 0)
        if now - last < FS_DEBOUNCE:
            return
        self._debounce_timers[key] = now

        for cb in self._callbacks:
            try:
                if asyncio.iscoroutinefunction(cb):
                    if self._loop:
                        self._loop.call_soon_threadsafe(
                            asyncio.ensure_future, cb(event)
                        )
                else:
                    cb(event)
            except Exception as e:
                logger.error(f"Change callback error: {e}")

    def handle_fs_event(self, experiment_id: str, file_path: str):
        """Called by watchdog handler."""
        # Only care about JSON files in checkpoint dirs
        if file_path.endswith(".json") or file_path.endswith(".jsonl"):
            self._fire_event(UnifiedEvent(
                type=EventType.NEW_PROGRAM,
                experiment_id=experiment_id,
                timestamp=time.time(),
                data={"source": "watchdog", "file": os.path.basename(file_path)},
            ))


if HAS_WATCHDOG:
    class _WatchdogHandler(FileSystemEventHandler):
        def __init__(self, engine: ChangeDetectionEngine, experiment_id: str):
            self._engine = engine
            self._experiment_id = experiment_id

        def on_modified(self, event: FileSystemEvent):
            if not event.is_directory:
                self._engine.handle_fs_event(self._experiment_id, event.src_path)

        def on_created(self, event: FileSystemEvent):
            if not event.is_directory:
                self._engine.handle_fs_event(self._experiment_id, event.src_path)


# Singleton
change_engine = ChangeDetectionEngine()
