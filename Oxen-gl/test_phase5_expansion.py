"""
Phase 5: Advanced Product Expansion End-to-End Verification Test Suite
Verifies:
1. SaaS Subscription & Plan Management (Control Plane)
2. Tenant Usage Limit Enforcement (403 Forbidden when exceeding plan users)
3. Tenant Billing Summary & Historical SaaS Invoices
4. Mobile Fleet Operations:
   - Dispatch trip (POST /api/mobile/trips)
   - Trip query (GET /api/mobile/trips)
   - GPS routing status update (PUT /api/mobile/trips/{id}/status)
   - Proof of Delivery submission (POST /api/mobile/delivery-proof)
   - Safety inspection checklist (POST /api/mobile/inspection-logs)
   - Offline batch sync with UUIDv4 deduplication (POST /api/mobile/sync)
5. Vehicle Maintenance & Fuel Management (linked to trips & vehicles)
6. Real-Time Multi-Tenant Analytics Dashboard (/api/analytics/tenant-summary)
"""

import json
import uuid
from decimal import Decimal
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"


def http_request(endpoint: str, method: str = "GET", data: dict = None, headers: dict = None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status_code = resp.status
            resp_body = resp.read().decode("utf-8")
            return status_code, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as err:
        err_body = err.read().decode("utf-8")
        try:
            return err.code, json.loads(err_body)
        except Exception:
            return err.code, {"error": err_body}


def run_phase5_verification():
    print("=" * 72)
    print("  PHASE 5: ADVANCED PRODUCT EXPANSION VERIFICATION SUITE  ")
    print("=" * 72)

    # -------------------------------------------------------------------------
    # STEP 1: Authenticate Master SuperAdmin & Tenant Admin
    # -------------------------------------------------------------------------
    print("\n--- STEP 1: Authentication & Setup ---")
    s_m_login, b_m_login = http_request(
        "/api/auth/master/login", "POST",
        {"identity": "superadmin@oxengl.com", "password": "OxenGL#IEhHsza7wOxH8DZj!2026"}
    )
    assert s_m_login == 200, f"Master login failed: {b_m_login}"
    master_token = b_m_login["access_token"]
    master_headers = {"Authorization": f"Bearer {master_token}"}
    print(f"[1.1] Master SuperAdmin Login: 200 OK (tier={b_m_login.get('tier')})")

    # Tenant Admin Login
    s_t_login, b_t_login = http_request(
        "/api/auth/tenant/login", "POST",
        {"workspace_slug": "horizon-logistics", "identity": "khaled@horizon.sa", "password": "SecurePassword#2026"}
    )
    assert s_t_login == 200, f"Tenant login failed: {b_t_login}"
    tenant_token = b_t_login["access_token"]
    slug = "horizon-logistics"
    tenant_headers = {
        "Authorization": f"Bearer {tenant_token}",
        "X-Tenant-Slug": slug,
    }
    print(f"[1.2] Tenant Admin Login: 200 OK (tier={b_t_login.get('tier')}, role={b_t_login.get('role')})")

    # Fetch company ID for horizon-logistics
    from backend.database import SessionLocal
    from backend.models import MasterTenant, ResCompany, ResUser
    from sqlalchemy import select

    db = SessionLocal()
    try:
        company = db.scalar(select(ResCompany).where(ResCompany.slug == slug))
        assert company is not None, f"Company for slug '{slug}' not found"
        company_id = str(company.id)
        # Ensure khaled user has correct company_id
        admin_user = db.scalar(select(ResUser).where(ResUser.email == "khaled@horizon.sa"))
        if admin_user and admin_user.company_id != company.id:
            admin_user.company_id = company.id
            db.commit()
    finally:
        db.close()

    tenant_headers["X-Company-ID"] = company_id
    print(f"[1.3] Company Context: {company_id} ({company.name})")

    # -------------------------------------------------------------------------
    # STEP 2: SaaS Subscription Plans & Control Plane Management
    # -------------------------------------------------------------------------
    print("\n--- STEP 2: SaaS Subscription & Plan Management ---")
    s_plans, b_plans = http_request("/api/master/subscriptions/plans", "GET")
    assert s_plans == 200 and len(b_plans) == 4, f"Failed to list plans: {b_plans}"
    print(f"[2.1] Subscription Plans Catalog: {len(b_plans)} tiers listed (starter, standard, growth, enterprise)")

    # Find master tenant ID for horizon-logistics
    from backend.database import SessionLocal
    from backend.models import MasterTenant
    from sqlalchemy import select

    db = SessionLocal()
    try:
        m_tenant = db.scalar(select(MasterTenant).where(MasterTenant.slug == slug))
        assert m_tenant is not None, "MasterTenant not found in db"
        tenant_uuid = str(m_tenant.id)
    finally:
        db.close()

    # Update subscription to 'starter' with 5 max users
    s_sub, b_sub = http_request(
        f"/api/master/tenants/{tenant_uuid}/subscription", "PUT",
        {"subscription_tier": "starter", "max_users": 5, "max_storage_gb": 5},
        headers=master_headers,
    )
    assert s_sub == 200, f"Failed to update tenant subscription: {b_sub}"
    assert b_sub["subscription_tier"] == "starter" and b_sub["max_users"] == 5
    print(f"[2.2] Updated Tenant Plan to 'starter': max_users={b_sub['max_users']}, max_storage_gb={b_sub['max_storage_gb']}")

    # -------------------------------------------------------------------------
    # STEP 3: Tenant Usage Limits Enforcement
    # -------------------------------------------------------------------------
    print("\n--- STEP 3: Tenant Usage Limits Enforcement ---")
    # Verify current billing summary
    s_bill, b_bill = http_request("/api/tenant/billing/summary", "GET", headers=tenant_headers)
    assert s_bill == 200, f"Failed to get billing summary: {b_bill}"
    assert b_bill["subscription_tier"] == "starter"
    assert b_bill["max_users"] == 5
    print(f"[3.1] Tenant Billing Summary: Tier='starter', Active Users={b_bill['current_users_count']}/5, Monthly={b_bill['monthly_rate_sar']} SAR")

    # In starter tier (max 5), fill up or attempt to exceed user limit
    current_users = b_bill["current_users_count"]
    users_to_add = max(0, 5 - current_users)
    for i in range(users_to_add):
        s_u, b_u = http_request(
            "/api/tenant/users", "POST",
            {
                "email": f"test_user_{uuid.uuid4().hex[:6]}@horizon.sa",
                "full_name": f"Test User {i}",
                "password": "Password@123",
                "role": "Data_Entry",
            },
            headers=tenant_headers,
        )
        assert s_u == 201, f"Failed to add user {i}: {b_u}"

    # Now attempt to add another user (exceeds limit)
    s_exceed, b_exceed = http_request(
        "/api/tenant/users", "POST",
        {
            "email": f"overflow_user_{uuid.uuid4().hex[:6]}@horizon.sa",
            "full_name": "Overflow User",
            "password": "Password@123",
            "role": "Data_Entry",
        },
        headers=tenant_headers,
    )
    print(f"[3.2] Exceed Plan Limit Attempt: status={s_exceed} (Expected 403 Forbidden)")
    assert s_exceed == 403, f"Expected 403 Forbidden, got {s_exceed}: {b_exceed}"
    assert "limit exceeded" in b_exceed.get("detail", "").lower(), f"Unexpected detail: {b_exceed}"
    print(f"      Rejected with detail: \"{b_exceed.get('detail')}\"")

    # Upgrade tenant back to 'enterprise'
    s_up, b_up = http_request(
        f"/api/master/tenants/{tenant_uuid}/subscription", "PUT",
        {"subscription_tier": "enterprise"},
        headers=master_headers,
    )
    assert s_up == 200, f"Failed to upgrade to enterprise: {b_up}"
    print(f"[3.3] Upgraded Tenant Plan to 'enterprise' (max_users={b_up['max_users']})")

    # Verify SaaS invoices
    s_invs, b_invs = http_request("/api/tenant/billing/invoices", "GET", headers=tenant_headers)
    assert s_invs == 200 and len(b_invs) > 0, f"Failed to get SaaS invoices: {b_invs}"
    print(f"[3.4] Tenant SaaS Invoices: {len(b_invs)} historical invoices retrieved (Latest: {b_invs[0]['invoice_number']}, Amount: {b_invs[0]['amount_sar']} SAR)")

    # -------------------------------------------------------------------------
    # STEP 4: Mobile Fleet Operations (Driver App Endpoints)
    # -------------------------------------------------------------------------
    print("\n--- STEP 4: Mobile Fleet Operations & Driver App API ---")
    # 4.1 Create / Dispatch a Trip
    trip_data = {
        "origin_location": "Riyadh Central Crusher #3",
        "destination_location": "King Salman Park Construction Site",
        "cargo_description": "Coarse Aggregate 20mm",
        "planned_weight_tons": 35.5,
        "notes": "Urgent delivery batch for concrete pour",
    }
    s_trip, b_trip = http_request("/api/mobile/trips", "POST", trip_data, headers=tenant_headers)
    assert s_trip == 201, f"Failed to create trip: {b_trip}"
    trip_id = b_trip["id"]
    trip_num = b_trip["trip_number"]
    assert b_trip["status"] == "assigned"
    print(f"[4.1] Dispatched Mobile Trip: ID={trip_id}, Number={trip_num}, Status={b_trip['status']}")

    # 4.2 Query Driver Trips
    s_trips, b_trips = http_request("/api/mobile/trips", "GET", headers=tenant_headers)
    assert s_trips == 200 and any(t["id"] == trip_id for t in b_trips)
    print(f"[4.2] Queried Mobile Trips: Found {len(b_trips)} trips for company")

    # 4.3 Update Trip Status with GPS Telemetry
    gps_update = {
        "status": "in_transit",
        "latitude": 24.713552,
        "longitude": 46.675297,
        "speed_kmh": 68.5,
        "notes": "Departed quarry, approaching Exit 10",
    }
    s_status, b_status = http_request(f"/api/mobile/trips/{trip_id}/status", "PUT", gps_update, headers=tenant_headers)
    assert s_status == 200, f"Failed to update trip status: {b_status}"
    assert b_status["status"] == "in_transit"
    assert b_status["actual_departure"] is not None
    assert float(b_status["speed_kmh"]) == 68.5
    print(f"[4.3] Updated Trip Status & GPS: Status='in_transit', Lat={b_status['current_latitude']}, Lng={b_status['current_longitude']}, Speed={b_status['speed_kmh']} km/h")

    # 4.4 Submit Proof of Delivery (POD)
    pod_payload = {
        "trip_id": trip_id,
        "recipient_name": "Eng. Faisal Al-Otaibi",
        "recipient_phone": "+966501234567",
        "latitude": 24.745812,
        "longitude": 46.702145,
        "accuracy_meters": 4.2,
        "digital_signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "encrypted_photo_urls": ["https://storage.oxengl.com/pod/trip-pod-001.enc.webp"],
        "delivery_notes": "All 35.5 tons received in full, quality approved.",
    }
    s_pod, b_pod = http_request("/api/mobile/delivery-proof", "POST", pod_payload, headers=tenant_headers)
    assert s_pod == 201, f"Failed to submit POD: {b_pod}"
    assert b_pod["recipient_name"] == "Eng. Faisal Al-Otaibi"
    print(f"[4.4] Submitted Proof of Delivery: Recipient='{b_pod['recipient_name']}', DeliveredAt={b_pod['delivered_at']}")

    # Verify trip was automatically completed
    s_trip_after, b_trip_after = http_request(f"/api/mobile/trips/{trip_id}", "GET", headers=tenant_headers)
    assert s_trip_after == 200 and b_trip_after["status"] == "delivered"
    assert b_trip_after["actual_delivery"] is not None
    print(f"[4.5] Verified Trip Lifecycle Completion: Status='{b_trip_after['status']}', ActualDelivery={b_trip_after['actual_delivery']}")

    # 4.6 Submit Pre-Trip Safety Inspection
    s_veh, b_veh = http_request("/api/fleet/vehicles", "GET", headers=tenant_headers)
    if not b_veh:
        s_nv, b_nv = http_request(
            "/api/fleet/vehicles", "POST",
            {
                "name": "Mercedes Actros 3340 Heavy Hauler",
                "license_plate": f"HOR-{uuid.uuid4().hex[:4].upper()}",
                "make": "Mercedes-Benz",
                "model": "Actros 3340",
                "vehicle_type": "truck",
                "current_odometer": 128400.0,
                "status": "active",
            },
            headers=tenant_headers,
        )
        assert s_nv == 201, f"Failed to create vehicle: {b_nv}"
        vehicle_id = b_nv["id"]
    else:
        vehicle_id = b_veh[0]["id"]

    insp_data = {
        "trip_id": trip_id,
        "vehicle_id": vehicle_id,
        "inspection_type": "pre_trip",
        "odometer_reading": 128450.0,
        "is_safe_to_operate": True,
        "notes": "Tires, air brakes, and lights all verified compliant.",
    }
    s_insp, b_insp = http_request("/api/mobile/inspection-logs", "POST", insp_data, headers=tenant_headers)
    assert s_insp == 201, f"Failed to submit inspection log: {b_insp}"
    print(f"[4.6] Pre-Trip Safety Inspection Logged: Safe={b_insp['is_safe_to_operate']}, Odo={b_insp['odometer_reading']} km")

    # 4.7 Offline Sync with UUIDv4 Deduplication
    print("\n--- STEP 5: Offline Sync Engine & Deduplication ---")
    op_id = str(uuid.uuid4())
    sync_payload = {
        "device_token": "dev_token_phase5_test",
        "events": [
            {
                "operation_id": op_id,
                "entity_type": "trip_inspection_log",
                "action": "create",
                "payload": {
                    "vehicle_id": vehicle_id,
                    "inspection_type": "post_trip",
                    "odometer_reading": 128520.0,
                    "is_safe_to_operate": True,
                    "notes": "Post-trip return inspection complete",
                },
                "client_timestamp": "2026-09-07T04:30:00Z",
            }
        ],
    }

    # Initial Sync Attempt (Should be APPLIED)
    s_sync1, b_sync1 = http_request("/api/mobile/sync", "POST", sync_payload, headers=tenant_headers)
    assert s_sync1 == 200, f"Sync attempt 1 failed: {b_sync1}"
    assert b_sync1["applied_count"] == 1
    assert b_sync1["duplicate_count"] == 0
    print(f"[5.1] Initial Offline Batch Sync: Applied={b_sync1['applied_count']}, Duplicates={b_sync1['duplicate_count']}")

    # Idempotent Repeat Attempt with SAME operation_id (Should be SKIPPED_DUPLICATE)
    s_sync2, b_sync2 = http_request("/api/mobile/sync", "POST", sync_payload, headers=tenant_headers)
    assert s_sync2 == 200, f"Sync attempt 2 failed: {b_sync2}"
    assert b_sync2["applied_count"] == 0
    assert b_sync2["duplicate_count"] == 1
    assert b_sync2["results"][0]["status"] == "SKIPPED_DUPLICATE"
    print(f"[5.2] Idempotent Duplicate Replay (UUIDv4 Deduplication): Status='{b_sync2['results'][0]['status']}', DuplicateCount={b_sync2['duplicate_count']}")

    # -------------------------------------------------------------------------
    # STEP 6: Vehicle Maintenance & Fuel Management
    # -------------------------------------------------------------------------
    print("\n--- STEP 6: Maintenance & Fuel Tracking ---")
    # Create Maintenance Order
    maint_payload = {
        "vehicle_id": vehicle_id,
        "order_type": "preventive",
        "priority": "medium",
        "description": "50,000 km Scheduled Service: Oil, Filters & Brake Pads",
        "odometer_reading": 128520.0,
        "total_parts_cost": 450.0,
        "total_labor_cost": 300.0,
        "total_cost": 750.0,
    }
    s_maint, b_maint = http_request("/api/fleet/maintenance-orders", "POST", maint_payload, headers=tenant_headers)
    assert s_maint == 201, f"Failed to create maintenance order: {b_maint}"
    print(f"[6.1] Created Preventive Maintenance Order: Number={b_maint['order_number']}, TotalCost={b_maint['total_cost']} SAR")

    # Log Fuel Transaction linked to Vehicle & Trip
    fuel_payload = {
        "vehicle_id": vehicle_id,
        "trip_id": trip_id,
        "liters": 120.0,
        "fuel_type": "diesel",
        "unit_price": 2.35,
        "total_amount": 282.0,
        "odometer_reading": 128520.0,
        "notes": "Post-trip refuel at Station 12",
    }
    s_fuel, b_fuel = http_request("/api/fleet/fuel-transactions", "POST", fuel_payload, headers=tenant_headers)
    assert s_fuel == 201, f"Failed to log fuel transaction: {b_fuel}"
    assert b_fuel["trip_id"] == trip_id
    print(f"[6.2] Logged Fuel Fill-Up: Number={b_fuel['transaction_number']}, Liters={b_fuel['liters']}, Total={b_fuel['total_amount']} SAR (Linked to Trip: {b_fuel['trip_id']})")

    # -------------------------------------------------------------------------
    # STEP 7: Real-Time Multi-Tenant Analytics & Dashboard
    # -------------------------------------------------------------------------
    print("\n--- STEP 7: Real-Time Multi-Tenant Analytics ---")
    s_analytics, b_analytics = http_request("/api/analytics/tenant-summary", "GET", headers=tenant_headers)
    assert s_analytics == 200, f"Failed to get analytics summary: {b_analytics}"
    print(f"[7.1] Tenant Analytics Real-Time Telemetry:")
    print(f"      Total Revenue:             {float(b_analytics['total_revenue']):,.2f} SAR")
    print(f"      Outstanding Receivables:   {float(b_analytics['outstanding_receivables']):,.2f} SAR")
    print(f"      Active Trips:              {b_analytics['active_trips']}")
    print(f"      Total Trips:               {b_analytics['total_trips']}")
    print(f"      Fleet Size:                {b_analytics['total_fleet_count']} vehicles")
    print(f"      Fleet Utilization Rate:    {b_analytics['fleet_utilization_rate']}%")
    print(f"      Total Fuel Consumed:       {float(b_analytics['total_fuel_consumed_liters']):,.2f} Liters")
    print(f"      Total Fuel Spent:          {float(b_analytics['total_fuel_spent_sar']):,.2f} SAR")
    print(f"      Average Fuel Price:        {float(b_analytics['avg_fuel_price_sar']):,.2f} SAR/L")

    assert b_analytics["total_fleet_count"] >= 1
    assert float(b_analytics["total_fuel_consumed_liters"]) >= 120.0

    print("\n" + "=" * 72)
    print("  ALL PHASE 5 PRODUCT EXPANSION VERIFICATION TESTS PASSED (100%)! ")
    print("=" * 72 + "\n")


if __name__ == "__main__":
    run_phase5_verification()
