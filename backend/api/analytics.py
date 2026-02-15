"""Analytics endpoints — LLM cost tracking, model posteriors, embeddings."""

from fastapi import APIRouter, HTTPException, Query

from backend.models.api import AnalyticsResponse
from backend.services.experiment_manager import manager

router = APIRouter(prefix="/experiments/{experiment_id}", tags=["analytics"])


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(experiment_id: str):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    analytics = adapter.get_analytics()
    return AnalyticsResponse(analytics=analytics)


@router.get("/embeddings")
async def get_embeddings(experiment_id: str, max_programs: int = Query(200, le=500)):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    data = adapter.get_embeddings(max_programs=max_programs)
    return data
