"""Experiment endpoints."""

from fastapi import APIRouter, HTTPException

from backend.models.api import ExperimentDetailResponse, ExperimentListResponse
from backend.services.experiment_manager import manager

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.get("", response_model=ExperimentListResponse)
async def list_experiments():
    experiments = manager.list_experiments()
    return ExperimentListResponse(experiments=experiments)


@router.get("/{experiment_id}", response_model=ExperimentDetailResponse)
async def get_experiment(experiment_id: str):
    exp = manager.get_experiment(experiment_id)
    if not exp:
        raise HTTPException(404, f"Experiment {experiment_id} not found")
    return ExperimentDetailResponse(experiment=exp)
