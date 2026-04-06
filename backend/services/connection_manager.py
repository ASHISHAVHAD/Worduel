"""WebSocket connection manager."""
from fastapi import WebSocket
from services.game_service import get_room


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.user_rooms: dict[str, str] = {}
        self.spectator_connections: dict[str, list] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        room_id = self.user_rooms.pop(user_id, None)
        return room_id

    def is_connected(self, user_id: str) -> bool:
        ws = self.active_connections.get(user_id)
        return ws is not None

    async def send_to_user(self, user_id: str, data: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                pass

    async def broadcast_to_room(self, room_id: str, data: dict, exclude: str = None):
        room = get_room(room_id)
        if not room:
            return
        for pid in room["players"]:
            if pid != exclude:
                await self.send_to_user(pid, data)
        for ws in self.spectator_connections.get(room_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass

    async def add_spectator(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.spectator_connections:
            self.spectator_connections[room_id] = []
        self.spectator_connections[room_id].append(websocket)

    def remove_spectator(self, room_id: str, websocket: WebSocket):
        if room_id in self.spectator_connections:
            self.spectator_connections[room_id] = [
                ws for ws in self.spectator_connections[room_id] if ws != websocket
            ]


manager = ConnectionManager()
