"""Tests for registry.load_directory_configs() and load_all()."""

import os
import textwrap

import pytest

from backend.adapters.registry import ProjectRegistry


class TestLoadDirectoryConfigs:
    def test_load_from_real_configs_dir(self):
        """Load from the actual configs/projects/ directory, verify both frameworks."""
        reg = ProjectRegistry()
        configs_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "configs",
            "projects",
        )
        reg.load_directory_configs(configs_dir)

        assert reg.get("openevolve") is not None
        assert reg.get("shinkaevolve") is not None
        assert reg.get("openevolve").display_name == "OpenEvolve"
        assert reg.get("shinkaevolve").display_name == "ShinkaEvolve"

    def test_load_from_empty_dir(self, tmp_path):
        reg = ProjectRegistry()
        reg.load_directory_configs(str(tmp_path))
        assert reg.all_configs() == {}

    def test_load_from_nonexistent_dir(self, tmp_path):
        """Loading from a nonexistent directory should not raise."""
        reg = ProjectRegistry()
        reg.load_directory_configs(str(tmp_path / "nonexistent"))
        assert reg.all_configs() == {}

    def test_load_skips_underscore_files(self, tmp_path):
        """Files starting with _ (like __init__.py) should be skipped."""
        (tmp_path / "__init__.py").write_text("PROJECT_CONFIG = {}")
        (tmp_path / "_private.py").write_text("PROJECT_CONFIG = {}")
        reg = ProjectRegistry()
        reg.load_directory_configs(str(tmp_path))
        assert reg.all_configs() == {}

    def test_load_skips_invalid_module(self, tmp_path):
        """A .py file that raises on import should be skipped with a warning."""
        (tmp_path / "broken.py").write_text("raise RuntimeError('broken on purpose')")
        reg = ProjectRegistry()
        reg.load_directory_configs(str(tmp_path))
        assert reg.all_configs() == {}

    def test_load_skips_missing_project_config(self, tmp_path):
        """A valid .py file without PROJECT_CONFIG is silently skipped."""
        (tmp_path / "no_config.py").write_text("x = 42\n")
        reg = ProjectRegistry()
        reg.load_directory_configs(str(tmp_path))
        assert reg.all_configs() == {}

    def test_load_valid_custom_config(self, tmp_path):
        """A .py file with a valid PROJECT_CONFIG dict gets registered."""
        code = textwrap.dedent("""\
            from backend.adapters.base import FrameworkAdapter
            from backend.models.unified import UnifiedExperiment, ExperimentStatus

            class DummyAdapter(FrameworkAdapter):
                def get_experiment_info(self):
                    return UnifiedExperiment(
                        id="d", name="d", framework="dummy", path=self.experiment_path,
                    )
                def get_programs(self, **kw): return [], 0
                def get_program(self, pid): return None
                def get_all_programs_brief(self): return []
                def get_conversations(self, **kw): return [], 0
                def get_metrics(self): return None
                def get_islands(self): return [], []
                def get_lineage(self, pid=None): return None
                def search_code(self, q, m=50): return []
                def get_last_modified(self): return 0.0

            PROJECT_CONFIG = {
                "name": "dummy",
                "adapter_class": DummyAdapter,
                "detect": lambda p: False,
                "glob_patterns": ["**/*.dummy"],
                "display_name": "Dummy",
            }
        """)
        (tmp_path / "dummy.py").write_text(code)
        reg = ProjectRegistry()
        reg.load_directory_configs(str(tmp_path))
        assert reg.get("dummy") is not None
        assert reg.get("dummy").display_name == "Dummy"


class TestLoadAll:
    def test_load_all_integrates(self):
        """load_all with the real configs/projects/ directory registers both frameworks."""
        reg = ProjectRegistry()
        configs_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "configs",
            "projects",
        )
        reg.load_all(projects_dir=configs_dir)
        names = set(reg.all_configs().keys())
        assert "openevolve" in names
        assert "shinkaevolve" in names

    def test_load_all_without_dir(self):
        """load_all with no dir only loads entry points (no crash)."""
        reg = ProjectRegistry()
        reg.load_all(projects_dir=None)
        # May or may not have configs from entry points, but should not raise
