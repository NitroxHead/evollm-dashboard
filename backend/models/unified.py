"""Unified data models shared across both frameworks."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ExperimentStatus(str, enum.Enum):
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    UNKNOWN = "unknown"


# ── Core program model ──────────────────────────────────────────────

class UnifiedProgram(BaseModel):
    id: str
    code: str
    language: str = "python"

    # Evolution
    parent_id: Optional[str] = None
    generation: int = 0
    island_id: Optional[int] = None
    timestamp: float = 0.0
    iteration_found: int = 0

    # Performance
    score: float = 0.0
    metrics: Dict[str, Any] = Field(default_factory=dict)
    correct: bool = True

    # Features
    complexity: float = 0.0
    diversity: float = 0.0

    # Code diff
    code_diff: Optional[str] = None
    changes_description: str = ""

    # Prompts & LLM
    prompts: Optional[Dict[str, Any]] = None
    llm_response: Optional[str] = None

    # Artifacts / feedback
    artifacts: Optional[Dict[str, Any]] = None
    text_feedback: Optional[str] = None

    # Embeddings
    embedding_2d: Optional[List[float]] = None
    embedding_3d: Optional[List[float]] = None
    embedding_cluster_id: Optional[int] = None

    # Genealogy
    children_count: int = 0
    in_archive: bool = False
    migration_history: List[Dict[str, Any]] = Field(default_factory=list)
    inspiration_ids: List[str] = Field(default_factory=list)

    # Metadata pass-through
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ── Experiment model ────────────────────────────────────────────────

class UnifiedExperiment(BaseModel):
    id: str
    name: str
    framework: str
    path: str
    status: ExperimentStatus = ExperimentStatus.UNKNOWN
    last_modified: float = 0.0

    # Quick stats
    total_programs: int = 0
    best_score: float = 0.0
    current_generation: int = 0
    num_islands: int = 0
    last_iteration: int = 0

    # Config
    config: Optional[Dict[str, Any]] = None


# ── Island model ────────────────────────────────────────────────────

class IslandState(BaseModel):
    island_id: int
    program_count: int = 0
    best_score: float = 0.0
    best_program_id: Optional[str] = None
    current_generation: int = 0
    program_ids: List[str] = Field(default_factory=list)


class MigrationEvent(BaseModel):
    timestamp: float
    program_id: str
    from_island: int
    to_island: int
    score: float = 0.0


# ── Events for WebSocket ───────────────────────────────────────────

class EventType(str, enum.Enum):
    NEW_PROGRAM = "new_program"
    IMPROVEMENT = "improvement"
    MIGRATION = "migration"
    GENERATION_COMPLETE = "generation_complete"
    STATUS_CHANGE = "status_change"
    EXPERIMENT_DISCOVERED = "experiment_discovered"


class UnifiedEvent(BaseModel):
    type: EventType
    experiment_id: str
    timestamp: float
    data: Dict[str, Any] = Field(default_factory=dict)


# ── Lineage ─────────────────────────────────────────────────────────

class LineageNode(BaseModel):
    id: str
    parent_id: Optional[str] = None
    generation: int = 0
    island_id: Optional[int] = None
    score: float = 0.0
    children: List[str] = Field(default_factory=list)
    changes_description: str = ""


class LineageTree(BaseModel):
    nodes: Dict[str, LineageNode] = Field(default_factory=dict)
    root_ids: List[str] = Field(default_factory=list)
    best_path: List[str] = Field(default_factory=list)


# ── Metrics time-series ─────────────────────────────────────────────

class TimeSeriesPoint(BaseModel):
    generation: int
    value: float
    timestamp: float = 0.0


class MetricsSummary(BaseModel):
    total_programs: int = 0
    best_score: float = 0.0
    mean_score: float = 0.0
    median_score: float = 0.0
    current_generation: int = 0
    programs_per_minute: float = 0.0
    improvement_rate: float = 0.0
    time_elapsed: float = 0.0

    # Time series
    best_score_history: List[TimeSeriesPoint] = Field(default_factory=list)
    mean_score_history: List[TimeSeriesPoint] = Field(default_factory=list)
    per_island_best: Dict[int, List[TimeSeriesPoint]] = Field(default_factory=dict)
    score_distribution: List[float] = Field(default_factory=list)

    # MAP-Elites
    map_elites_grid: Optional[Dict[str, Any]] = None

    # LLM stats
    total_llm_calls: int = 0
    total_tokens: int = 0


# ── Conversation model ──────────────────────────────────────────────

# ── Analytics models ───────────────────────────────────────────────

class CostTimeSeriesPoint(BaseModel):
    generation: int
    cumulative_cost: float = 0.0
    api_cost: float = 0.0
    embed_cost: float = 0.0
    novelty_cost: float = 0.0
    meta_cost: float = 0.0


class ModelUsageStats(BaseModel):
    model_name: str
    total_uses: int = 0
    total_cost: float = 0.0
    improvements: int = 0
    improvement_rate: float = 0.0
    avg_score_delta: float = 0.0


class ModelPosteriorPoint(BaseModel):
    generation: int
    posteriors: Dict[str, float] = Field(default_factory=dict)


class AnalyticsSummary(BaseModel):
    total_cost: float = 0.0
    total_api_cost: float = 0.0
    total_embed_cost: float = 0.0
    total_novelty_cost: float = 0.0
    total_meta_cost: float = 0.0
    cost_time_series: List[CostTimeSeriesPoint] = Field(default_factory=list)
    model_usage: List[ModelUsageStats] = Field(default_factory=list)
    model_posteriors_over_time: List[ModelPosteriorPoint] = Field(default_factory=list)
    patch_type_distribution: Dict[str, int] = Field(default_factory=dict)


# ── Conversation model ──────────────────────────────────────────────

class ConversationEntry(BaseModel):
    program_id: str
    parent_id: Optional[str] = None
    iteration: int = 0
    generation: int = 0
    island_id: Optional[int] = None
    timestamp: float = 0.0

    # Prompt parts
    system_prompt: Optional[str] = None
    user_prompt: Optional[str] = None

    # Response
    llm_response: Optional[str] = None

    # Outcome
    score: float = 0.0
    parent_score: float = 0.0
    improvement_delta: float = 0.0
    mutation_type: str = ""

    # Code
    code_diff: Optional[str] = None
