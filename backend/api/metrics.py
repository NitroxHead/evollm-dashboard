"""Metrics endpoints."""

from fastapi import APIRouter, HTTPException

from backend.models.api import MetricsResponse
from backend.services.experiment_manager import manager

router = APIRouter(prefix="/experiments/{experiment_id}", tags=["metrics"])


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(experiment_id: str):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    summary = adapter.get_metrics()
    return MetricsResponse(summary=summary)
