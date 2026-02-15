"""Conversation endpoints."""

import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from backend.models.api import ConversationListResponse
from backend.services.experiment_manager import manager

router = APIRouter(prefix="/experiments/{experiment_id}", tags=["conversations"])


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    experiment_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    improvements_only: bool = Query(False),
    island_id: Optional[int] = Query(None),
):
    adapter = manager.get_adapter(experiment_id)
    if not adapter:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    items, total = adapter.get_conversations(
        page=page,
        page_size=page_size,
        improvements_only=improvements_only,
        island_id=island_id,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return ConversationListResponse(
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )
