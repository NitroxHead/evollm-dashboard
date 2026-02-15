"""Shared test fixtures for the EvoLLM Dashboard test suite."""

import json
import os
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock

import pytest

from backend.adapters.base import FrameworkAdapter
from backend.adapters.registry import ProjectConfig, ProjectRegistry
from backend.models.unified import (
    ConversationEntry,
    ExperimentStatus,
    IslandState,
    LineageTree,
    MetricsSummary,
    MigrationEvent,
    UnifiedExperiment,
    UnifiedProgram,
)


# ── Mock adapter ──────────────────────────────────────────────────

class MockAdapter(FrameworkAdapter):
    """Minimal concrete FrameworkAdapter returning canned data."""

    def get_experiment_info(self) -> UnifiedExperiment:
        return UnifiedExperiment(
            id="mock_exp",
            name="Mock Experiment",
            framework="mock",
            path=self.experiment_path,
            status=ExperimentStatus.RUNNING,
            total_programs=10,
            best_score=0.95,
        )

    def get_programs(self, **kwargs) -> tuple[List[UnifiedProgram], int]:
        return [], 0

    def get_program(self, program_id: str) -> Optional[UnifiedProgram]:
        return None

    def get_all_programs_brief(self) -> List[Dict[str, Any]]:
        return []

    def get_conversations(self, **kwargs) -> tuple[List[ConversationEntry], int]:
        return [], 0

    def get_metrics(self) -> MetricsSummary:
        return MetricsSummary()

    def get_islands(self) -> tuple[List[IslandState], List[MigrationEvent]]:
        return [], []

    def get_lineage(self, program_id: Optional[str] = None) -> LineageTree:
        return LineageTree()

    def search_code(self, query: str, max_results: int = 50) -> List[UnifiedProgram]:
        return []

    def get_last_modified(self) -> float:
        return 0.0


# ── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def mock_adapter_class():
    """Return the MockAdapter class for use in ProjectConfig."""
    return MockAdapter


@pytest.fixture
def mock_project_config(mock_adapter_class):
    """A ProjectConfig that uses MockAdapter and always-True detect."""
    return ProjectConfig(
        name="mock",
        adapter_class=mock_adapter_class,
        detect=lambda path: True,
        glob_patterns=["**/*.mock"],
        display_name="Mock Framework",
        description="A mock framework for testing",
        badge_color="#ff0000",
        badge_bg="rgba(255, 0, 0, 0.15)",
        change_detection="poll",
    )


@pytest.fixture
def fresh_registry():
    """A clean ProjectRegistry instance (no global state)."""
    return ProjectRegistry()


@pytest.fixture
def tmp_openevolve_experiment(tmp_path):
    """Create a minimal OpenEvolve experiment directory structure.

    Layout:
        tmp_path/my_experiment/
            checkpoint_0/
                metadata.json
            programs/
    """
    exp_dir = tmp_path / "my_experiment"
    cp_dir = exp_dir / "checkpoint_0"
    cp_dir.mkdir(parents=True)
    (cp_dir / "metadata.json").write_text(json.dumps({
        "generation": 0,
        "best_score": 0.5,
        "num_programs": 3,
    }))
    (exp_dir / "programs").mkdir()
    return str(exp_dir)


@pytest.fixture
def tmp_shinka_experiment(tmp_path):
    """Create a minimal ShinkaEvolve experiment file.

    Layout:
        tmp_path/evolution.sqlite   (empty file)
    """
    db_file = tmp_path / "evolution.sqlite"
    db_file.write_bytes(b"")
    return str(db_file)
