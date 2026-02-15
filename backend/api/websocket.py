"""WebSocket handler for real-time updates."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.config import WS_HEARTBEAT_INTERVAL
from backend.models.unified import UnifiedEvent

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and subscriptions."""

    def __init__(self):
        # experiment_id -> set of websockets
        self._subscriptions: Dict[str, Set[WebSocket]] = {}
        self._all_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self._all_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self._all_connections.discard(websocket)
        for subs in self._subscriptions.values():
            subs.discard(websocket)

    def subscribe(self, websocket: WebSocket, experiment_id: str):
        self._subscriptions.setdefault(experiment_id, set()).add(websocket)

    def unsubscribe(self, websocket: WebSocket, experiment_id: str):
        if experiment_id in self._subscriptions:
            self._subscriptions[experiment_id].discard(websocket)

    async def broadcast(self, event: UnifiedEvent):
        """Broadcast event to all subscribers of the experiment."""
        subs = self._subscriptions.get(event.experiment_id, set())
        # Also send to connections subscribed to "*" (all experiments)
        subs = subs | self._subscriptions.get("*", set())

        msg = json.dumps({
            "type": event.type.value,
            "experiment_id": event.experiment_id,
            "timestamp": event.timestamp,
            "data": event.data,
        })

        dead: list[WebSocket] = []
        for ws in subs:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws)

    async def broadcast_all(self, event: UnifiedEvent):
        """Broadcast to ALL connected clients."""
        msg = json.dumps({
            "type": event.type.value,
            "experiment_id": event.experiment_id,
            "timestamp": event.timestamp,
            "data": event.data,
        })

        dead: list[WebSocket] = []
        for ws in self._all_connections:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws)


ws_manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            try:
                raw = await asyncio.wait_for(
                    websocket.receive_text(), timeout=WS_HEARTBEAT_INTERVAL
                )
                # Handle client messages
                try:
                    msg = json.loads(raw)
                    action = msg.get("action")
                    eid = msg.get("experiment_id", "*")

                    if action == "subscribe":
                        ws_manager.subscribe(websocket, eid)
                        await websocket.send_text(json.dumps({
                            "type": "subscribed",
                            "experiment_id": eid,
                            "timestamp": time.time(),
                        }))
                    elif action == "unsubscribe":
                        ws_manager.unsubscribe(websocket, eid)
                    elif action == "ping":
                        await websocket.send_text(json.dumps({
                            "type": "pong",
                            "timestamp": time.time(),
                        }))
                except json.JSONDecodeError:
                    pass

            except asyncio.TimeoutError:
                # Send heartbeat
                try:
                    await websocket.send_text(json.dumps({
                        "type": "heartbeat",
                        "timestamp": time.time(),
                    }))
                except Exception:
                    break

    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(websocket)
