"""Request / Response schemas for the REST API."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .unified import (
    AnalyticsSummary,
    ConversationEntry,
    IslandState,
    MetricsSummary,
    MigrationEvent,
    UnifiedExperiment,
    UnifiedProgram,
    LineageTree,
)


# ── Pagination ──────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Experiments ─────────────────────────────────────────────────────

class ExperimentListResponse(BaseModel):
    experiments: List[UnifiedExperiment]


class ExperimentDetailResponse(BaseModel):
    experiment: UnifiedExperiment


# ── Programs ────────────────────────────────────────────────────────

class ProgramListResponse(BaseModel):
    items: List[UnifiedProgram]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProgramDetailResponse(BaseModel):
    program: UnifiedProgram


class ProgramSearchResponse(BaseModel):
    items: List[UnifiedProgram]
    total: int
    query: str


# ── Conversations ───────────────────────────────────────────────────

class ConversationListResponse(BaseModel):
    items: List[ConversationEntry]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Metrics ─────────────────────────────────────────────────────────

class MetricsResponse(BaseModel):
    summary: MetricsSummary


# ── Islands ─────────────────────────────────────────────────────────

class IslandsResponse(BaseModel):
    islands: List[IslandState]
    migrations: List[MigrationEvent]


# ── Lineage ─────────────────────────────────────────────────────────

class LineageResponse(BaseModel):
    tree: LineageTree


# ── Analytics ──────────────────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    analytics: AnalyticsSummary
