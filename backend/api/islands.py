"""Island endpoints."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

from backend.adapters.shinka_adapter import ShinkaAdapter
from backend.models.api import IslandsResponse
from backend.services.experiment_manager import manager

router = APIRouter(prefix="/experiments/{experiment_id}", tags=["islands"])


@router.get("/islands", response_model=IslandsResponse)
async def get_islands(experiment_id: str):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    islands, migrations = adapter.get_islands()
    return IslandsResponse(islands=islands, migrations=migrations)


@router.get("/lineage")
async def get_lineage(experiment_id: str, program_id: Optional[str] = None):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    tree = adapter.get_lineage(program_id=program_id)
    return {"tree": tree}


@router.get("/best-path")
async def get_best_path(experiment_id: str):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    tree = adapter.get_lineage()
    path_programs = []
    for pid in tree.best_path:
        prog = adapter.get_program(pid)
        if prog:
            path_programs.append(prog.model_dump())
    return {"path": path_programs}


@router.get("/meta-files")
async def get_meta_files(experiment_id: str):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    if isinstance(adapter, ShinkaAdapter):
        return {"files": adapter.get_meta_files()}
    return {"files": []}


@router.get("/meta-content/{generation}")
async def get_meta_content(experiment_id: str, generation: int):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    if isinstance(adapter, ShinkaAdapter):
        content = adapter.get_meta_content(generation)
        if content is not None:
            return {"content": content, "generation": generation}
    raise HTTPException(404, "Meta file not found")
