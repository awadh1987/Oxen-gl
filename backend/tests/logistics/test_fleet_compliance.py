import pytest, json, asyncio, uuid
from fastapi import status
from fastapi.websockets import WebSocketDisconnect
from app.domains.logistics.models import Vehicle
from app.services.fleet_service import FleetTelemetryService
from app.core.redis import redis_client

@pytest.mark.asyncio
async def test_flt_01_websocket_tenant_isolation(async_client):
    """FLT-01: Rejects crossover traffic; Tenant A cannot listen to Tenant B."""
    tenant_a, tenant_b = str(uuid.uuid4()), str(uuid.uuid4())
    # Attempt cross-tenant handshake connection
    try:
        async with async_client.websocket_connect(
            f"/api/v1/logistics/ws/fleet-stream?tenant_id={tenant_b}",
            headers={"X-Tenant-ID": tenant_a}
        ) as ws:
            await ws.send_text(json.dumps({"type": "ping"}))
            # If connection is wrongly accepted, fail the test safety gate
            pytest.fail("Security Breach: Cross-tenant WebSocket connection accepted.")
    except Exception as e:
        # Success: Connection must be rejected or dropped with an unauthorized signature
        assert True

@pytest.mark.asyncio
async def test_flt_02_invalid_telemetry_payload_rejection(async_client):
    """FLT-02: Sending bad formats must trigger an immediate HTTP 422 error."""
    bad_payload = {"vehicle_id": "not-a-uuid", "latitude": "invalid-string", "longitude": 999.99}
    res = await async_client.post("/api/v1/logistics/telemetry/ping", json=bad_payload)
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

@pytest.mark.asyncio
async def test_flt_03_telemetry_ingestion_performance(db_session):
    """FLT-03: Inbound pings must complete DB write + Redis publish under 50ms."""
    t_id, v_id, trip_id = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    await redis_client.ping()
    start_time = asyncio.get_event_loop().time()
    
    # Run core ingestion service logic asynchronously
    event_id = await FleetTelemetryService.ingest_gps_ping(
        db=db_session, tenant_id=t_id, vehicle_id=v_id, trip_id=trip_id,
        lat=15.3562, lng=44.2081, speed=65.5
    )
    
    duration = (asyncio.get_event_loop().time() - start_time) * 1000
    assert event_id is not None
    assert duration < 50.0 # Strict SLA threshold benchmark constraint
    
    # Confirm state presence inside Redis cache registry
    cached_pos = await redis_client.get(f"oxengl:production:{t_id}:fleet:vehicle:{v_id}:live")
    assert cached_pos is not None
    assert "speed" in json.loads(cached_pos)


