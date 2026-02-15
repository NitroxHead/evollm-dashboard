"""Integration tests for backend.services.experiment_manager."""

from unittest.mock import patch, MagicMock

import pytest

from backend.adapters.registry import ProjectConfig, ProjectRegistry
from backend.models.unified import ExperimentStatus, UnifiedExperiment
from backend.services.experiment_manager import ExperimentManager


# We need to import the module-level MockAdapter from conftest
from tests.conftest import MockAdapter


class TestExperimentManagerScan:
    def test_scan_discovers_via_registry(self, tmp_path, mock_adapter_class):
        """Mock registry.discover_experiments to return fake paths, verify manager populates."""
        reg = ProjectRegistry()
        cfg = ProjectConfig(
            name="mock",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
        )
        reg.register(cfg)

        mgr = ExperimentManager()

        fake_discoveries = [(str(tmp_path / "exp1"), "mock")]

        with patch.object(reg, "discover_experiments", return_value=fake_discoveries):
            with patch("backend.services.experiment_manager.registry", reg):
                mgr.scan()

        exps = mgr.list_experiments()
        assert len(exps) == 1
        assert exps[0].id == "mock_exp"
        assert exps[0].framework == "mock"

    def test_scan_handles_adapter_failure(self, tmp_path, mock_adapter_class):
        """If adapter.get_experiment_info() raises, that experiment is skipped."""

        class FailAdapter(mock_adapter_class):
            def get_experiment_info(self):
                raise RuntimeError("fail")

        reg = ProjectRegistry()
        cfg = ProjectConfig(
            name="fail",
            adapter_class=FailAdapter,
            detect=lambda p: True,
            glob_patterns=[],
        )
        reg.register(cfg)

        mgr = ExperimentManager()
        fake_discoveries = [(str(tmp_path / "bad"), "fail")]

        with patch.object(reg, "discover_experiments", return_value=fake_discoveries):
            with patch("backend.services.experiment_manager.registry", reg):
                mgr.scan()  # should not raise

        assert mgr.list_experiments() == []


class TestExperimentManagerAPI:
    def test_list_experiments_returns_info(self, tmp_path, mock_adapter_class):
        reg = ProjectRegistry()
        cfg = ProjectConfig(
            name="mock",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
        )
        reg.register(cfg)

        mgr = ExperimentManager()
        fake_discoveries = [
            (str(tmp_path / "a"), "mock"),
            (str(tmp_path / "b"), "mock"),
        ]

        with patch.object(reg, "discover_experiments", return_value=fake_discoveries):
            with patch("backend.services.experiment_manager.registry", reg):
                mgr.scan()

        exps = mgr.list_experiments()
        # MockAdapter always returns id="mock_exp", so duplicates collapse to 1
        assert len(exps) >= 1
        assert all(isinstance(e, UnifiedExperiment) for e in exps)

    def test_get_experiment_found(self, tmp_path, mock_adapter_class):
        reg = ProjectRegistry()
        cfg = ProjectConfig(
            name="mock",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
        )
        reg.register(cfg)

        mgr = ExperimentManager()
        fake_discoveries = [(str(tmp_path / "a"), "mock")]

        with patch.object(reg, "discover_experiments", return_value=fake_discoveries):
            with patch("backend.services.experiment_manager.registry", reg):
                mgr.scan()

        exp = mgr.get_experiment("mock_exp")
        assert exp is not None
        assert exp.id == "mock_exp"

    def test_get_experiment_not_found(self):
        mgr = ExperimentManager()
        assert mgr.get_experiment("nonexistent") is None

    def test_get_adapter(self, tmp_path, mock_adapter_class):
        reg = ProjectRegistry()
        cfg = ProjectConfig(
            name="mock",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
        )
        reg.register(cfg)

        mgr = ExperimentManager()
        fake_discoveries = [(str(tmp_path / "a"), "mock")]

        with patch.object(reg, "discover_experiments", return_value=fake_discoveries):
            with patch("backend.services.experiment_manager.registry", reg):
                mgr.scan()

        adapter = mgr.get_adapter("mock_exp")
        assert adapter is not None
        assert isinstance(adapter, mock_adapter_class)

    def test_get_all_adapters_returns_copy(self, tmp_path, mock_adapter_class):
        reg = ProjectRegistry()
        cfg = ProjectConfig(
            name="mock",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
        )
        reg.register(cfg)

        mgr = ExperimentManager()
        fake_discoveries = [(str(tmp_path / "a"), "mock")]

        with patch.object(reg, "discover_experiments", return_value=fake_discoveries):
            with patch("backend.services.experiment_manager.registry", reg):
                mgr.scan()

        adapters = mgr.get_all_adapters()
        assert isinstance(adapters, dict)
        # Mutating the returned dict should not affect internal state
        adapters.clear()
        assert mgr.get_adapter("mock_exp") is not None
