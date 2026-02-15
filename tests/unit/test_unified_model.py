"""Tests for backend.models.unified — Pydantic model behaviour."""

import time

import pytest

from backend.models.unified import (
    ExperimentStatus,
    UnifiedExperiment,
    UnifiedProgram,
    IslandState,
    MigrationEvent,
    LineageNode,
    LineageTree,
    MetricsSummary,
    UnifiedEvent,
    EventType,
    ConversationEntry,
    AnalyticsSummary,
)


class TestUnifiedExperiment:
    def test_framework_accepts_string(self):
        """framework is a plain str, accepting arbitrary framework names."""
        exp = UnifiedExperiment(
            id="test_1",
            name="Test",
            framework="openevolve",
            path="/tmp/test",
        )
        assert exp.framework == "openevolve"

    def test_framework_accepts_arbitrary_string(self):
        exp = UnifiedExperiment(
            id="test_2",
            name="Test",
            framework="my_custom_framework",
            path="/tmp/test",
        )
        assert exp.framework == "my_custom_framework"

    def test_experiment_defaults(self):
        exp = UnifiedExperiment(
            id="x", name="X", framework="f", path="/p",
        )
        assert exp.status == ExperimentStatus.UNKNOWN
        assert exp.total_programs == 0
        assert exp.best_score == 0.0
        assert exp.config is None

    def test_experiment_serialization(self):
        exp = UnifiedExperiment(
            id="se_1",
            name="Shinka Run",
            framework="shinkaevolve",
            path="/data/run.sqlite",
            status=ExperimentStatus.RUNNING,
            total_programs=100,
            best_score=0.99,
            current_generation=5,
            num_islands=3,
            config={"lr": 0.01},
        )
        data = exp.model_dump()
        assert data["id"] == "se_1"
        assert data["framework"] == "shinkaevolve"
        assert data["status"] == "running"
        assert data["config"] == {"lr": 0.01}

        # Round-trip
        exp2 = UnifiedExperiment.model_validate(data)
        assert exp2 == exp

    def test_experiment_json_roundtrip(self):
        exp = UnifiedExperiment(
            id="j1", name="JSON Test", framework="test", path="/p",
            status=ExperimentStatus.COMPLETED,
        )
        json_str = exp.model_dump_json()
        exp2 = UnifiedExperiment.model_validate_json(json_str)
        assert exp2 == exp


class TestUnifiedProgram:
    def test_defaults(self):
        prog = UnifiedProgram(id="p1", code="print('hi')")
        assert prog.language == "python"
        assert prog.generation == 0
        assert prog.score == 0.0
        assert prog.metrics == {}
        assert prog.children_count == 0
        assert prog.migration_history == []

    def test_full_construction(self):
        prog = UnifiedProgram(
            id="p2",
            code="def solve(): pass",
            parent_id="p1",
            generation=3,
            island_id=1,
            score=0.85,
            metrics={"accuracy": 0.9},
            embedding_2d=[0.1, 0.2],
            in_archive=True,
        )
        assert prog.parent_id == "p1"
        assert prog.island_id == 1
        assert prog.embedding_2d == [0.1, 0.2]
        assert prog.in_archive is True


class TestEventModel:
    def test_event_type_enum(self):
        assert EventType.NEW_PROGRAM.value == "new_program"
        assert EventType.EXPERIMENT_DISCOVERED.value == "experiment_discovered"

    def test_event_serialization(self):
        evt = UnifiedEvent(
            type=EventType.NEW_PROGRAM,
            experiment_id="exp_1",
            timestamp=1234567890.0,
            data={"program_id": "p1"},
        )
        data = evt.model_dump()
        assert data["type"] == "new_program"
        assert data["data"]["program_id"] == "p1"


class TestIslandAndMigration:
    def test_island_defaults(self):
        island = IslandState(island_id=0)
        assert island.program_count == 0
        assert island.program_ids == []

    def test_migration_event(self):
        mig = MigrationEvent(
            timestamp=time.time(),
            program_id="p1",
            from_island=0,
            to_island=1,
            score=0.8,
        )
        assert mig.from_island == 0
        assert mig.to_island == 1


class TestLineage:
    def test_lineage_tree_empty(self):
        tree = LineageTree()
        assert tree.nodes == {}
        assert tree.root_ids == []
        assert tree.best_path == []

    def test_lineage_tree_with_nodes(self):
        root = LineageNode(id="r", score=0.5, children=["c1"])
        child = LineageNode(id="c1", parent_id="r", generation=1, score=0.8)
        tree = LineageTree(
            nodes={"r": root, "c1": child},
            root_ids=["r"],
            best_path=["r", "c1"],
        )
        assert len(tree.nodes) == 2
        assert tree.best_path[-1] == "c1"


class TestConversationEntry:
    def test_defaults(self):
        entry = ConversationEntry(program_id="p1")
        assert entry.parent_id is None
        assert entry.score == 0.0
        assert entry.mutation_type == ""

    def test_full(self):
        entry = ConversationEntry(
            program_id="p2",
            parent_id="p1",
            system_prompt="You are...",
            user_prompt="Improve...",
            llm_response="def solve()...",
            score=0.9,
            parent_score=0.7,
            improvement_delta=0.2,
        )
        assert entry.improvement_delta == pytest.approx(0.2)


class TestAnalyticsSummary:
    def test_defaults(self):
        a = AnalyticsSummary()
        assert a.total_cost == 0.0
        assert a.model_usage == []
        assert a.patch_type_distribution == {}
