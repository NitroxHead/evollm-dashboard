"""Integration tests for backend.services.change_detection."""

import sys
import time
from unittest.mock import patch, MagicMock

import pytest

from backend.adapters.registry import ProjectConfig, ProjectRegistry
from backend.services.change_detection import ChangeDetectionEngine

from tests.conftest import MockAdapter

# The local import in register_experiment() does:
#   from backend.adapters.registry import registry
# Since backend.adapters.__init__ re-exports `registry`, the name is shadowed.
# We must patch via sys.modules to reach the actual module attribute.
_registry_module = sys.modules["backend.adapters.registry"]


def _patch_registry(reg):
    """Context manager to replace the module-level `registry` singleton."""
    return patch.object(_registry_module, "registry", reg)


class TestRegisterExperiment:
    def test_register_experiment_poll_strategy(self, mock_adapter_class):
        """Framework with change_detection='poll' registers as poll."""
        reg = ProjectRegistry()
        cfg = ProjectConfig(
            name="poller",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
            change_detection="poll",
        )
        reg.register(cfg)

        engine = ChangeDetectionEngine()
        with _patch_registry(reg):
            engine.register_experiment("exp1", "/tmp/exp", "poller")

        meta = engine._experiment_meta.get("exp1")
        assert meta is not None
        assert meta["strategy"] == "poll"

    def test_register_experiment_watchdog_strategy(self, mock_adapter_class):
        """Framework with change_detection='watchdog' registers as watchdog."""
        reg = ProjectRegistry()
        cfg = ProjectConfig(
            name="watcher",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
            change_detection="watchdog",
        )
        reg.register(cfg)

        engine = ChangeDetectionEngine()
        with _patch_registry(reg):
            engine.register_experiment("exp2", "/tmp/exp2", "watcher")

        meta = engine._experiment_meta.get("exp2")
        assert meta is not None
        # Strategy is set from config regardless of HAS_WATCHDOG
        assert meta["strategy"] == "watchdog"

    def test_register_unknown_framework_falls_back_to_poll(self, mock_adapter_class):
        """If framework not found in registry, strategy defaults to 'poll'."""
        reg = ProjectRegistry()
        engine = ChangeDetectionEngine()
        with _patch_registry(reg):
            engine.register_experiment("exp3", "/tmp/exp3", "unknown_framework")

        meta = engine._experiment_meta.get("exp3")
        assert meta is not None
        assert meta["strategy"] == "poll"


class TestCallbacks:
    def test_on_change_registers_callback(self):
        engine = ChangeDetectionEngine()
        cb = MagicMock()
        engine.on_change(cb)
        assert cb in engine._callbacks

    def test_fire_event_calls_sync_callback(self):
        """A synchronous callback gets called by _fire_event."""
        engine = ChangeDetectionEngine()
        cb = MagicMock()
        engine.on_change(cb)

        from backend.models.unified import EventType, UnifiedEvent
        event = UnifiedEvent(
            type=EventType.NEW_PROGRAM,
            experiment_id="exp1",
            timestamp=time.time(),
            data={"source": "test"},
        )
        engine._fire_event(event)
        cb.assert_called_once_with(event)

    def test_fire_event_debounces(self):
        """Rapid successive events for the same key are debounced."""
        engine = ChangeDetectionEngine()
        cb = MagicMock()
        engine.on_change(cb)

        from backend.models.unified import EventType, UnifiedEvent
        event = UnifiedEvent(
            type=EventType.NEW_PROGRAM,
            experiment_id="exp1",
            timestamp=time.time(),
            data={},
        )

        engine._fire_event(event)
        engine._fire_event(event)  # should be debounced

        assert cb.call_count == 1


class TestHandleFsEvent:
    def test_json_file_fires_event(self):
        engine = ChangeDetectionEngine()
        cb = MagicMock()
        engine.on_change(cb)

        engine.handle_fs_event("exp1", "/path/to/checkpoint_0/program.json")
        assert cb.call_count == 1
        event = cb.call_args[0][0]
        assert event.data["source"] == "watchdog"

    def test_jsonl_file_fires_event(self):
        engine = ChangeDetectionEngine()
        cb = MagicMock()
        engine.on_change(cb)

        engine.handle_fs_event("exp1", "/path/to/trace.jsonl")
        assert cb.call_count == 1

    def test_non_json_file_ignored(self):
        engine = ChangeDetectionEngine()
        cb = MagicMock()
        engine.on_change(cb)

        engine.handle_fs_event("exp1", "/path/to/image.png")
        assert cb.call_count == 0


class TestPollLoopStrategy:
    def test_poll_loop_only_polls_poll_strategy(self, tmp_path, mock_adapter_class):
        """Only experiments with strategy='poll' are polled for mtime changes."""
        reg = ProjectRegistry()
        cfg_poll = ProjectConfig(
            name="poller",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
            change_detection="poll",
        )
        cfg_watch = ProjectConfig(
            name="watcher",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
            change_detection="watchdog",
        )
        reg.register(cfg_poll)
        reg.register(cfg_watch)

        engine = ChangeDetectionEngine()
        with _patch_registry(reg):
            engine.register_experiment("poll_exp", str(tmp_path / "poll.sqlite"), "poller")
            engine.register_experiment("watch_exp", str(tmp_path / "watch"), "watcher")

        # Verify strategies were assigned
        assert engine._experiment_meta["poll_exp"]["strategy"] == "poll"
        assert engine._experiment_meta["watch_exp"]["strategy"] == "watchdog"
