"""Abstract base class for framework adapters."""

from __future__ import annotations

import abc
from typing import Any, Dict, List, Optional

from backend.models.unified import (
    AnalyticsSummary,
    ConversationEntry,
    IslandState,
    LineageTree,
    MetricsSummary,
    MigrationEvent,
    UnifiedExperiment,
    UnifiedProgram,
)


class FrameworkAdapter(abc.ABC):
    """Read-only adapter that reads experiment data from a framework's storage."""

    def __init__(self, experiment_path: str):
        self.experiment_path = experiment_path

    @abc.abstractmethod
    def get_experiment_info(self) -> UnifiedExperiment:
        """Return experiment metadata."""

    @abc.abstractmethod
    def get_programs(
        self,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "generation",
        sort_desc: bool = True,
        island_id: Optional[int] = None,
        generation_min: Optional[int] = None,
        generation_max: Optional[int] = None,
        score_min: Optional[float] = None,
        archive_only: bool = False,
        correct_only: bool = False,
    ) -> tuple[List[UnifiedProgram], int]:
        """Return paginated, filtered list of programs and total count."""

    @abc.abstractmethod
    def get_program(self, program_id: str) -> Optional[UnifiedProgram]:
        """Return a single program by ID."""

    @abc.abstractmethod
    def get_all_programs_brief(self) -> List[Dict[str, Any]]:
        """Return minimal data for all programs (for genealogy/metrics)."""

    @abc.abstractmethod
    def get_conversations(
        self,
        page: int = 1,
        page_size: int = 50,
        improvements_only: bool = False,
        island_id: Optional[int] = None,
    ) -> tuple[List[ConversationEntry], int]:
        """Return paginated conversations."""

    @abc.abstractmethod
    def get_metrics(self) -> MetricsSummary:
        """Return aggregated metrics."""

    @abc.abstractmethod
    def get_islands(self) -> tuple[List[IslandState], List[MigrationEvent]]:
        """Return island states and migration events."""

    @abc.abstractmethod
    def get_lineage(self, program_id: Optional[str] = None) -> LineageTree:
        """Build lineage tree, optionally rooted at program_id."""

    @abc.abstractmethod
    def search_code(self, query: str, max_results: int = 50) -> List[UnifiedProgram]:
        """Full-text search across program source code."""

    @abc.abstractmethod
    def get_last_modified(self) -> float:
        """Return timestamp of the most recent modification (for status inference)."""

    def get_analytics(self) -> AnalyticsSummary:
        """Return analytics summary. Override in adapters that support it."""
        return AnalyticsSummary()

    def get_embeddings(self, max_programs: int = 200) -> Dict[str, Any]:
        """Return embedding similarity data. Override in adapters that support it."""
        return {}
