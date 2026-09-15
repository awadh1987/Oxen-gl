# File: backend/app/domains/logistics/ws_stream.py
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.domains.logistics.router_engine import AutomatedRouteOptimizer

logger = logging.getLogger("oxengl_telemetry")
router = APIRouter(prefix="/api/v1/logistics", tags=["Telemetry Stream"])

# Instantiating the route calculation optimizer engine
optimizer = AutomatedRouteOptimizer()

@router.websocket("/ws/fleet-stream")
async def fleet_telemetry_stream_endpoint(websocket: WebSocket):
    """
    Consumes live telemetry arrays via persistent WebSocket connections,
    running real-time Haversine cost matrices to flag vector deviations.
    """
    await websocket.accept()
    logger.info("📡 Telemetry Stream Pipeline Connected: HTTP 101 Handshake Active")
    
    try:
        while True:
            # 1. Accept raw packet payload matrix arrays from streaming threads
            raw_data = await websocket.receive_text()
            packet = json.loads(raw_data)
            
            # 2. Extract telemetry coordinates vectors
            vehicle_id = packet.get("vehicle_id", "TRK-UNKNOWN")
            current_gps = (packet.get("lat", 24.7136), packet.get("lon", 46.6753))
            assigned_target = (packet.get("target_lat"), packet.get("target_lon"))
            
            # 3. Trigger automatic path evaluation if active route vectors exist
            if assigned_target[0] and assigned_target[1]:
                congestion_coeff = packet.get("congestion_index", 0.1)
                
                # Run the math optimization matrix
                route_metrics = optimizer.evaluate_optimal_path(
                    origin=current_gps,
                    destination=assigned_target,
                    active_congestion=congestion_coeff
                )
                
                # Check spatial distance thresholds for dynamic deviation flag alerts
                # If vehicle drifts further than 15.0 km from optimal path arcs, trip alarm
                if route_metrics["base_distance_km"] > 15.0:
                    packet["routing_status"] = "VECTOR_DEVIATION_ALERT"
                    packet["deviation_magnitude_km"] = route_metrics["base_distance_km"]
                    logger.warning(f"⚠️ DEVIATION: {vehicle_id} drifted {route_metrics['base_distance_km']}km off course!")
                else:
                    packet["routing_status"] = "ON_SCHEDULE"
                
                # Append computed travel metrics down to the streaming matrix
                packet["eta_hours"] = route_metrics["estimated_transit_time_hrs"]
                packet["weighted_cost_index"] = route_metrics["weighted_cost_index"]

            # 4. Stream augmented real-time data metrics back out to client panels
            await websocket.send_text(json.dumps(packet))
            
    except WebSocketDisconnect:
        logger.info(f"🔌 Telemetry Stream Handle Disconnected from Client Mesh Interface.")
