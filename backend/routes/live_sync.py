"""
Live Sync WebSocket Manager for Staff & Doctor Portals
Provides real-time updates for:
- New appointments
- Appointment status changes
- New orders (Pharmacy & Diagnostics)
- Order status changes
- Patient check-ins
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, List, Optional
from datetime import datetime, timezone
import json
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live-sync", tags=["live-sync"])

class LiveSyncManager:
    """
    Manages WebSocket connections for real-time updates to staff and doctors
    """
    def __init__(self):
        # Connections by portal type
        self.staff_connections: Dict[str, Set[WebSocket]] = {
            "diagyn": set(),
            "mango": set(),
            "orange": set(),
            "all": set()
        }
        self.doctor_connections: Dict[str, Set[WebSocket]] = {}  # doctor_id -> connections
        
        # Connection metadata
        self.connection_info: Dict[WebSocket, dict] = {}
        
        # Recent events cache (for new connections to catch up)
        self.recent_events: List[dict] = []
        self.max_recent_events = 50
    
    async def connect_staff(self, websocket: WebSocket, portal: str, staff_id: str = None):
        """Connect a staff member to live sync"""
        await websocket.accept()
        
        if portal not in self.staff_connections:
            self.staff_connections[portal] = set()
        
        self.staff_connections[portal].add(websocket)
        self.staff_connections["all"].add(websocket)
        
        self.connection_info[websocket] = {
            "type": "staff",
            "portal": portal,
            "staff_id": staff_id,
            "connected_at": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"[LiveSync] Staff connected: {portal}, staff_id={staff_id}")
        
        # Send recent events to catch up
        await self._send_recent_events(websocket, portal)
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "portal": portal,
            "message": f"Connected to {portal} live sync",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def connect_doctor(self, websocket: WebSocket, doctor_id: str):
        """Connect a doctor to live sync"""
        await websocket.accept()
        
        if doctor_id not in self.doctor_connections:
            self.doctor_connections[doctor_id] = set()
        
        self.doctor_connections[doctor_id].add(websocket)
        
        self.connection_info[websocket] = {
            "type": "doctor",
            "doctor_id": doctor_id,
            "connected_at": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"[LiveSync] Doctor connected: {doctor_id}")
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "doctor_id": doctor_id,
            "message": f"Connected to doctor live sync",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket"""
        info = self.connection_info.get(websocket, {})
        
        if info.get("type") == "staff":
            portal = info.get("portal", "all")
            if portal in self.staff_connections:
                self.staff_connections[portal].discard(websocket)
            self.staff_connections["all"].discard(websocket)
            logger.info(f"[LiveSync] Staff disconnected: {portal}")
        
        elif info.get("type") == "doctor":
            doctor_id = info.get("doctor_id")
            if doctor_id and doctor_id in self.doctor_connections:
                self.doctor_connections[doctor_id].discard(websocket)
            logger.info(f"[LiveSync] Doctor disconnected: {doctor_id}")
        
        self.connection_info.pop(websocket, None)
    
    async def broadcast_to_staff(self, portal: str, event: dict):
        """Broadcast event to all staff connected to a portal"""
        event["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        # Add to recent events cache
        self._add_to_recent_events(event, portal)
        
        connections = self.staff_connections.get(portal, set())
        disconnected = []
        
        for ws in connections:
            try:
                await ws.send_json(event)
            except Exception as e:
                logger.error(f"[LiveSync] Error broadcasting to staff: {e}")
                disconnected.append(ws)
        
        for ws in disconnected:
            self.disconnect(ws)
        
        logger.info(f"[LiveSync] Broadcast to {len(connections)} staff in {portal}: {event.get('type')}")
    
    async def broadcast_to_doctor(self, doctor_id: str, event: dict):
        """Broadcast event to a specific doctor"""
        event["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        connections = self.doctor_connections.get(doctor_id, set())
        disconnected = []
        
        for ws in connections:
            try:
                await ws.send_json(event)
            except Exception as e:
                logger.error(f"[LiveSync] Error broadcasting to doctor: {e}")
                disconnected.append(ws)
        
        for ws in disconnected:
            self.disconnect(ws)
        
        logger.info(f"[LiveSync] Broadcast to doctor {doctor_id}: {event.get('type')}")
    
    async def notify_new_appointment(self, appointment: dict):
        """Notify staff and doctor of a new appointment"""
        event = {
            "type": "new_appointment",
            "data": {
                "id": appointment.get("id"),
                "patient_name": appointment.get("patient_name"),
                "patient_phone": appointment.get("patient_phone"),
                "doctor_name": appointment.get("doctor_name"),
                "doctor_id": appointment.get("doctor_id"),
                "clinic_id": appointment.get("clinic_id"),
                "appointment_date": appointment.get("appointment_date"),
                "time_slot": appointment.get("time_slot"),
                "status": appointment.get("status"),
                "created_at": appointment.get("created_at")
            }
        }
        
        await self.broadcast_to_staff("diagyn", event)
        
        if appointment.get("doctor_id"):
            await self.broadcast_to_doctor(appointment["doctor_id"], event)
    
    async def notify_appointment_status_change(self, appointment: dict, old_status: str, new_status: str):
        """Notify about appointment status change"""
        event = {
            "type": "appointment_status_change",
            "data": {
                "id": appointment.get("id"),
                "patient_name": appointment.get("patient_name"),
                "old_status": old_status,
                "new_status": new_status,
                "doctor_id": appointment.get("doctor_id"),
                "clinic_id": appointment.get("clinic_id")
            }
        }
        
        await self.broadcast_to_staff("diagyn", event)
        
        if appointment.get("doctor_id"):
            await self.broadcast_to_doctor(appointment["doctor_id"], event)
    
    async def notify_patient_checkin(self, appointment: dict, queue_position: int):
        """Notify about patient check-in"""
        event = {
            "type": "patient_checkin",
            "data": {
                "id": appointment.get("id"),
                "patient_name": appointment.get("patient_name"),
                "doctor_id": appointment.get("doctor_id"),
                "clinic_id": appointment.get("clinic_id"),
                "queue_position": queue_position,
                "checked_in_at": datetime.now(timezone.utc).isoformat()
            }
        }
        
        await self.broadcast_to_staff("diagyn", event)
        
        if appointment.get("doctor_id"):
            await self.broadcast_to_doctor(appointment["doctor_id"], event)
    
    async def notify_new_order(self, order_type: str, order: dict):
        """Notify staff of a new order (pharmacy or diagnostic)"""
        portal = "orange" if order_type == "pharmacy" else "mango"
        
        event = {
            "type": f"new_{order_type}_order",
            "data": {
                "id": order.get("id"),
                "patient_name": order.get("patient_name"),
                "patient_phone": order.get("patient_phone"),
                "status": order.get("status"),
                "total_amount": order.get("total_amount"),
                "items_count": len(order.get("medicines", order.get("tests", []))),
                "created_at": order.get("created_at")
            }
        }
        
        await self.broadcast_to_staff(portal, event)
    
    async def notify_order_status_change(self, order_type: str, order: dict, old_status: str, new_status: str):
        """Notify about order status change"""
        portal = "orange" if order_type == "pharmacy" else "mango"
        
        event = {
            "type": f"{order_type}_order_status_change",
            "data": {
                "id": order.get("id"),
                "patient_name": order.get("patient_name"),
                "old_status": old_status,
                "new_status": new_status
            }
        }
        
        await self.broadcast_to_staff(portal, event)
    
    def _add_to_recent_events(self, event: dict, portal: str):
        """Add event to recent events cache"""
        cached_event = {**event, "portal": portal}
        self.recent_events.append(cached_event)
        if len(self.recent_events) > self.max_recent_events:
            self.recent_events = self.recent_events[-self.max_recent_events:]
    
    async def _send_recent_events(self, websocket: WebSocket, portal: str):
        """Send recent events to a newly connected client"""
        relevant_events = [
            e for e in self.recent_events 
            if e.get("portal") == portal or e.get("portal") == "all"
        ][-10:]  # Last 10 relevant events
        
        if relevant_events:
            await websocket.send_json({
                "type": "recent_events",
                "events": relevant_events
            })
    
    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "staff_connections": {
                portal: len(conns) for portal, conns in self.staff_connections.items()
            },
            "doctor_connections": {
                doc_id: len(conns) for doc_id, conns in self.doctor_connections.items()
            },
            "total_connections": len(self.connection_info),
            "recent_events_cached": len(self.recent_events)
        }


# Global instance
live_sync_manager = LiveSyncManager()


def init_router(db):
    """Initialize the router with database connection"""
    
    @router.websocket("/staff/{portal}")
    async def staff_websocket(websocket: WebSocket, portal: str, staff_id: str = None):
        """WebSocket endpoint for staff live sync"""
        await live_sync_manager.connect_staff(websocket, portal, staff_id)
        try:
            while True:
                data = await websocket.receive_text()
                # Handle incoming messages from staff (e.g., acknowledgments)
                try:
                    message = json.loads(data)
                    if message.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except Exception:
                    pass
        except WebSocketDisconnect:
            live_sync_manager.disconnect(websocket)
    
    @router.websocket("/doctor/{doctor_id}")
    async def doctor_websocket(websocket: WebSocket, doctor_id: str):
        """WebSocket endpoint for doctor live sync"""
        await live_sync_manager.connect_doctor(websocket, doctor_id)
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    message = json.loads(data)
                    if message.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except Exception:
                    pass
        except WebSocketDisconnect:
            live_sync_manager.disconnect(websocket)
    
    @router.get("/stats")
    async def get_stats():
        """Get live sync connection statistics"""
        return live_sync_manager.get_connection_stats()
    
    return router, live_sync_manager
