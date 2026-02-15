"""FastAPI application — EvoLLM Dashboard backend."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import experiments, programs, conversations, metrics, islands, analytics, websocket
from backend.api.websocket import ws_manager
from backend.config import API_PREFIX, CORS_ORIGINS
from backend.services.change_detection import change_engine
from backend.services.experiment_manager import manager

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting EvoLLM Dashboard backend...")

    # Start experiment discovery
    manager.start()

    # Wire change detection → WebSocket broadcast
    loop = asyncio.get_event_loop()
    change_engine.set_loop(loop)
    change_engine.on_change(ws_manager.broadcast)

    # Register discovered experiments with change engine
    for eid, adapter in manager.get_all_adapters().items():
        info = adapter.get_experiment_info()
        change_engine.register_experiment(eid, info.path, info.framework)

    change_engine.start()

    logger.info("Backend started — scanning for experiments in evollm-dashboard/")
    yield

    logger.info("Shutting down...")
    change_engine.stop()
    manager.stop()


app = FastAPI(
    title="EvoLLM Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST routers
app.include_router(experiments.router, prefix=API_PREFIX)
app.include_router(programs.router, prefix=API_PREFIX)
app.include_router(conversations.router, prefix=API_PREFIX)
app.include_router(metrics.router, prefix=API_PREFIX)
app.include_router(islands.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)

# Mount WebSocket router
app.include_router(websocket.router)


@app.get("/api/health")
async def health():
    exps = manager.list_experiments()
    return {
        "status": "ok",
        "experiments_count": len(exps),
        "experiments": [{"id": e.id, "name": e.name, "framework": e.framework.value} for e in exps],
    }


if __name__ == "__main__":
    import uvicorn
    from backend.config import HOST, PORT

    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
