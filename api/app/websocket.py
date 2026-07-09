"""WebSocket manager for real-time family transaction sync."""

import json
from typing import Dict, Set

from fastapi import WebSocket

# Maps family_id -> set of connected WebSockets
active_families: Dict[int, Set[WebSocket]] = {}


async def connect(family_id: int, websocket: WebSocket):
    """Register a WebSocket connection for a family."""
    await websocket.accept()
    if family_id not in active_families:
        active_families[family_id] = set()
    active_families[family_id].add(websocket)


def disconnect(family_id: int, websocket: WebSocket):
    """Unregister a WebSocket connection."""
    if family_id in active_families:
        active_families[family_id].discard(websocket)
        if not active_families[family_id]:
            del active_families[family_id]


async def broadcast_to_family(family_id: int, message: dict):
    """Send a message to all connected members of a family."""
    if family_id not in active_families:
        return

    data = json.dumps(message)
    disconnected = set()

    for websocket in active_families[family_id]:
        try:
            await websocket.send_text(data)
        except Exception:
            disconnected.add(websocket)

    for ws in disconnected:
        disconnect(family_id, ws)
