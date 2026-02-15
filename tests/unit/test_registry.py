"""Tests for backend.adapters.registry — ProjectRegistry class."""

import os
import json

import pytest

from backend.adapters.registry import ProjectConfig, ProjectRegistry


class TestRegisterAndGet:
    def test_register_and_get(self, fresh_registry, mock_project_config):
        fresh_registry.register(mock_project_config)
        result = fresh_registry.get("mock")
        assert result is mock_project_config

    def test_get_unknown_returns_none(self, fresh_registry):
        assert fresh_registry.get("nonexistent") is None

    def test_register_overwrites_same_name(self, fresh_registry, mock_project_config, mock_adapter_class):
        fresh_registry.register(mock_project_config)
        replacement = ProjectConfig(
            name="mock",
            adapter_class=mock_adapter_class,
            detect=lambda p: False,
            glob_patterns=["**/*.other"],
        )
        fresh_registry.register(replacement)
        assert fresh_registry.get("mock") is replacement


class TestAllConfigs:
    def test_all_configs_empty(self, fresh_registry):
        assert fresh_registry.all_configs() == {}

    def test_all_configs_returns_copy(self, fresh_registry, mock_project_config):
        fresh_registry.register(mock_project_config)
        configs = fresh_registry.all_configs()
        assert "mock" in configs
        # Mutating the returned dict should not affect registry
        configs.pop("mock")
        assert fresh_registry.get("mock") is not None

    def test_all_configs_multiple(self, fresh_registry, mock_adapter_class):
        for name in ("alpha", "beta", "gamma"):
            cfg = ProjectConfig(
                name=name,
                adapter_class=mock_adapter_class,
                detect=lambda p: False,
                glob_patterns=[],
            )
            fresh_registry.register(cfg)
        assert set(fresh_registry.all_configs().keys()) == {"alpha", "beta", "gamma"}


class TestDetectFramework:
    def test_detect_framework(self, fresh_registry, mock_project_config):
        fresh_registry.register(mock_project_config)
        # mock_project_config.detect always returns True
        assert fresh_registry.detect_framework("/any/path") == "mock"

    def test_detect_framework_returns_none_for_unknown(self, fresh_registry, mock_adapter_class):
        cfg = ProjectConfig(
            name="never_match",
            adapter_class=mock_adapter_class,
            detect=lambda p: False,
            glob_patterns=[],
        )
        fresh_registry.register(cfg)
        assert fresh_registry.detect_framework("/some/path") is None

    def test_detect_framework_survives_exception(self, fresh_registry, mock_adapter_class):
        """If detect() raises, that config is skipped, not propagated."""

        def bad_detect(p):
            raise RuntimeError("boom")

        cfg = ProjectConfig(
            name="buggy",
            adapter_class=mock_adapter_class,
            detect=bad_detect,
            glob_patterns=[],
        )
        fresh_registry.register(cfg)
        assert fresh_registry.detect_framework("/path") is None

    def test_detect_returns_first_match(self, fresh_registry, mock_adapter_class):
        cfg_a = ProjectConfig(
            name="first",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
        )
        cfg_b = ProjectConfig(
            name="second",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=[],
        )
        fresh_registry.register(cfg_a)
        fresh_registry.register(cfg_b)
        result = fresh_registry.detect_framework("/any")
        assert result == "first"


class TestCreateAdapter:
    def test_create_adapter(self, fresh_registry, mock_project_config):
        fresh_registry.register(mock_project_config)
        adapter = fresh_registry.create_adapter("/tmp/exp", "mock")
        assert adapter is not None
        assert adapter.experiment_path == "/tmp/exp"

    def test_create_adapter_unknown_returns_none(self, fresh_registry):
        assert fresh_registry.create_adapter("/tmp/exp", "no_such") is None


class TestDiscoverExperiments:
    def test_discover_experiments(self, fresh_registry, mock_adapter_class, tmp_openevolve_experiment):
        """Discover OpenEvolve-style experiments with dedup."""
        from configs.projects.openevolve import _detect_openevolve, _resolve_openevolve_path

        cfg = ProjectConfig(
            name="oe",
            adapter_class=mock_adapter_class,
            detect=_detect_openevolve,
            glob_patterns=["**/checkpoint_*/metadata.json"],
            resolve_experiment_path=_resolve_openevolve_path,
        )
        fresh_registry.register(cfg)

        base = os.path.dirname(tmp_openevolve_experiment)
        results = fresh_registry.discover_experiments(base)
        paths = [p for p, _ in results]
        names = [n for _, n in results]

        assert len(results) >= 1
        assert all(n == "oe" for n in names)
        # Should dedup: even if multiple checkpoints match, only one experiment root
        real_paths = [os.path.realpath(p) for p in paths]
        assert len(real_paths) == len(set(real_paths))

    def test_discover_experiments_with_resolver(self, fresh_registry, mock_adapter_class, tmp_path):
        """Verify resolve_experiment_path is called to map glob match → root."""
        resolved_to = []

        def track_resolver(match_path):
            result = os.path.dirname(os.path.dirname(match_path))
            resolved_to.append(result)
            return result

        # Create dir structure: base/exp/checkpoint_0/metadata.json
        exp = tmp_path / "exp" / "checkpoint_0"
        exp.mkdir(parents=True)
        (exp / "metadata.json").write_text("{}")

        cfg = ProjectConfig(
            name="tracked",
            adapter_class=mock_adapter_class,
            detect=lambda p: os.path.isdir(p),
            glob_patterns=["**/checkpoint_*/metadata.json"],
            resolve_experiment_path=track_resolver,
        )
        fresh_registry.register(cfg)

        fresh_registry.discover_experiments(str(tmp_path))
        assert len(resolved_to) >= 1

    def test_discover_empty_dir(self, fresh_registry, mock_adapter_class, tmp_path):
        """No experiments in an empty directory."""
        cfg = ProjectConfig(
            name="empty",
            adapter_class=mock_adapter_class,
            detect=lambda p: True,
            glob_patterns=["**/*.sqlite"],
        )
        fresh_registry.register(cfg)
        assert fresh_registry.discover_experiments(str(tmp_path)) == []


class TestGetFrameworkMetadata:
    def test_get_framework_metadata(self, fresh_registry, mock_project_config):
        fresh_registry.register(mock_project_config)
        meta = fresh_registry.get_framework_metadata()
        assert len(meta) == 1
        m = meta[0]
        assert m["name"] == "mock"
        assert m["display_name"] == "Mock Framework"
        assert m["description"] == "A mock framework for testing"
        assert m["badge_color"] == "#ff0000"
        assert m["badge_bg"] == "rgba(255, 0, 0, 0.15)"
        assert m["change_detection"] == "poll"

    def test_metadata_display_name_fallback(self, fresh_registry, mock_adapter_class):
        """When display_name is None, metadata should fall back to name."""
        cfg = ProjectConfig(
            name="fallback_test",
            adapter_class=mock_adapter_class,
            detect=lambda p: False,
            glob_patterns=[],
            display_name=None,
        )
        fresh_registry.register(cfg)
        meta = fresh_registry.get_framework_metadata()
        assert meta[0]["display_name"] == "fallback_test"

    def test_metadata_empty_registry(self, fresh_registry):
        assert fresh_registry.get_framework_metadata() == []
