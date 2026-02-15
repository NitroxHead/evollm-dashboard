"""Program endpoints."""

import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from backend.models.api import ProgramDetailResponse, ProgramListResponse, ProgramSearchResponse
from backend.services.experiment_manager import manager

router = APIRouter(prefix="/experiments/{experiment_id}", tags=["programs"])


@router.get("/programs", response_model=ProgramListResponse)
async def list_programs(
    experiment_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    sort_by: str = Query("generation"),
    sort_desc: bool = Query(True),
    island_id: Optional[int] = Query(None),
    generation_min: Optional[int] = Query(None),
    generation_max: Optional[int] = Query(None),
    score_min: Optional[float] = Query(None),
    archive_only: bool = Query(False),
    correct_only: bool = Query(False),
):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    items, total = adapter.get_programs(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_desc=sort_desc,
        island_id=island_id,
        generation_min=generation_min,
        generation_max=generation_max,
        score_min=score_min,
        archive_only=archive_only,
        correct_only=correct_only,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return ProgramListResponse(
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )


@router.get("/programs/{program_id}", response_model=ProgramDetailResponse)
async def get_program(experiment_id: str, program_id: str):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    program = adapter.get_program(program_id)
    if not program:
        raise HTTPException(404, f"Program {program_id} not found")
    return ProgramDetailResponse(program=program)


@router.get("/search", response_model=ProgramSearchResponse)
async def search_programs(
    experiment_id: str,
    q: str = Query(..., min_length=1),
    max_results: int = Query(50, ge=1, le=200),
):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    results = adapter.search_code(q, max_results=max_results)
    return ProgramSearchResponse(items=results, total=len(results), query=q)
