#!/usr/bin/env python3
"""
Automated Verification Suite for the Planning Department Module:
- Tier 1: Project Charters (Strategic Planning, Budgets, SMART Goals, KPIs)
- Tier 2: Execution Tasks (Operational Matrix, Phase/Department Grouping, Workload, Status)
- Tier 3: Strategic Hazards (Proactive Risk Tracker, Mitigation Lifecycle)
- Route Verification: Path /planning
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3000"

def request_json(url, method="GET", data=None, headers=None):
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, {"raw_error": content}

def test_planning_module():
    print("=================================================================")
    print(" RUNNING AUTOMATED VERIFICATION: PLANNING DEPARTMENT MODULE")
    print("=================================================================")

    # 1. Verify Frontend Route /planning
    print("\n[Test 1] Verifying /planning frontend HTTP route...")
    req = urllib.request.Request(f"{BASE_URL}/planning", method="GET")
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        html = resp.read().decode("utf-8")
        assert "<html" in html or "<!DOCTYPE" in html or "react" in html.lower()
        print("  ✓ Route /planning responds with HTTP 200 OK and valid HTML bundle.")

    # 2. Query initial charters
    print("\n[Test 2] Querying Tier 1 Project Charters...")
    status, data = request_json(f"{BASE_URL}/api/tenant/planning/charters")
    assert status == 200, f"Expected 200, got {status}"
    charters = data.get("charters", [])
    assert len(charters) > 0, "Expected at least 1 seed charter"
    seed_charter = charters[0]
    charter_id = seed_charter["id"]
    print(f"  ✓ Retrieved {len(charters)} charters. Active seed charter ID: {charter_id} ('{seed_charter['project_name']}')")
    print(f"    Budget: SAR {seed_charter['total_budget']:,} | Timeline: {seed_charter['start_date']} -> {seed_charter['end_date']}")

    # 3. Provision a new Project Charter
    print("\n[Test 3] Provisioning a new Project Charter...")
    new_charter_payload = {
        "project_name": "Riyadh Metro Cold Logistics Corridor Rollout",
        "manager_name": "Eng. Faisal Al-Otaibi",
        "start_date": "2026-10-01",
        "end_date": "2027-03-31",
        "total_budget": 2500000.00,
        "scope_of_work_text": "Establishing a high-throughput cold-chain buffer depot connecting Dry Port Riyadh with distribution hubs.",
        "smart_goals": [
            {"id": "g1", "goal": "Deploy 40 smart reefer semi-trailers", "target_date": "2026-12-31", "status": "PENDING"},
            {"id": "g2", "goal": "Zero temperature excursion on transit", "target_date": "2027-02-28", "status": "PENDING"}
        ],
        "kpis_json": {
            "target_sla_pct": 99.8,
            "cost_per_pallet_sar": 45.0
        }
    }
    status, created_charter_resp = request_json(f"{BASE_URL}/api/tenant/planning/charters", method="POST", data=new_charter_payload)
    assert status == 201, f"Expected 201 Created, got {status}: {created_charter_resp}"
    new_charter_id = created_charter_resp["charter"]["id"]
    print(f"  ✓ Provisioned new charter: {new_charter_id} - '{created_charter_resp['charter']['project_name']}'")

    # 4. Batch Create Execution Tasks
    print("\n[Test 4] Batch creating Tier 2 Execution Tasks...")
    batch_tasks = [
        {
            "task_name": "Equip Fleet with Solar Auxiliary Reefer Battery Packs",
            "phase": "Execution",
            "department": "Fleet Operations",
            "assigned_user_name": "Eng. Faisal Al-Otaibi",
            "priority": "CRITICAL",
            "planned_hours": 160,
            "task_cost": 320000.00,
            "materials_required": ["40x 48V Solar Panels", "Inverters", "LiFePO4 Battery Banks"]
        },
        {
            "task_name": "ZATCA E-Invoicing Phase 2 Integration with Weighbridge Fleet",
            "phase": "Planning",
            "department": "Legal & Compliance",
            "assigned_user_name": "Salman Al-Dossary",
            "priority": "HIGH",
            "planned_hours": 80,
            "task_cost": 45000.00,
            "materials_required": ["Cryptographic Hardware Tokens", "ZATCA Sandbox API Keys"]
        },
        {
            "task_name": "Depot Cold-Storage Groundbreaking & Civil Works",
            "phase": "Initiation",
            "department": "Warehouse",
            "assigned_user_name": "Khaled Al-Harbi",
            "priority": "HIGH",
            "planned_hours": 240,
            "task_cost": 850000.00,
            "materials_required": ["Concrete", "Thermal Insulated Panels"]
        }
    ]
    status, batch_resp = request_json(
        f"{BASE_URL}/api/tenant/planning/tasks/batch",
        method="POST",
        data={"charter_id": new_charter_id, "tasks": batch_tasks}
    )
    assert status == 201, f"Expected 201, got {status}: {batch_resp}"
    created_tasks = batch_resp.get("tasks", [])
    assert len(created_tasks) == 3, f"Expected 3 tasks created, got {len(created_tasks)}"
    target_task = created_tasks[0]
    task_id = target_task["id"]
    print(f"  ✓ Successfully batch created {len(created_tasks)} execution tasks.")
    print(f"    Target Task: {task_id} - '{target_task['task_name']}' (Phase: {target_task['phase']}, Dept: {target_task['department']})")

    # 5. Inline Update Execution Task Status
    print("\n[Test 5] Updating Execution Task Status inline...")
    status, update_task_resp = request_json(
        f"{BASE_URL}/api/tenant/planning/tasks/{task_id}/status",
        method="PUT",
        data={"status": "IN_PROGRESS"}
    )
    assert status == 200, f"Expected 200, got {status}"
    assert update_task_resp["task"]["status"] == "IN_PROGRESS"
    print(f"  ✓ Task {task_id} status updated to 'IN_PROGRESS'.")

    # 6. Log a Strategic Hazard (Tier 3 Risk Tracker)
    print("\n[Test 6] Logging a Strategic Hazard linked to Execution Task...")
    hazard_payload = {
        "execution_task_id": task_id,
        "desired_outcome": "Uninterrupted cooling during extreme 50°C summer desert haulage",
        "potential_hazard_description": "Battery pack thermal throttling due to ambient dust accumulation on solar heatsinks",
        "severity": "HIGH",
        "mitigation_plan": "Install dual-cyclonic dust deflector cowlings and weekly thermal inspection regimen."
    }
    status, hazard_resp = request_json(
        f"{BASE_URL}/api/tenant/planning/hazards",
        method="POST",
        data=hazard_payload
    )
    assert status == 201, f"Expected 201, got {status}: {hazard_resp}"
    hazard_id = hazard_resp["hazard"]["id"]
    assert hazard_resp["hazard"]["mitigation_status"] == "IDENTIFIED"
    print(f"  ✓ Logged strategic hazard: {hazard_id} (Severity: {hazard_resp['hazard']['severity']}, Status: IDENTIFIED)")

    # 7. Update Hazard Mitigation Status
    print("\n[Test 7] Executing Hazard Mitigation Action...")
    mitigate_payload = {
        "mitigation_status": "MITIGATED",
        "mitigation_plan": "Installed certified IP67 cyclonic cowlings with telemetry alerts verified on live pilot rig."
    }
    status, mit_resp = request_json(
        f"{BASE_URL}/api/tenant/planning/hazards/{hazard_id}/mitigate",
        method="PUT",
        data=mitigate_payload
    )
    assert status == 200, f"Expected 200, got {status}"
    assert mit_resp["hazard"]["mitigation_status"] == "MITIGATED"
    assert mit_resp["hazard"]["mitigated_at"] is not None
    print(f"  ✓ Hazard {hazard_id} transitioned to MITIGATED at {mit_resp['hazard']['mitigated_at']}.")

    # 8. Query Planning Analytics & Telemetry
    print("\n[Test 8] Fetching Planning Department Analytics & Telemetry...")
    status, analytics = request_json(f"{BASE_URL}/api/tenant/planning/analytics")
    assert status == 200, f"Expected 200, got {status}"
    print(f"  ✓ Total Charters: {analytics['total_charters']} (Active: {analytics['active_charters']})")
    print(f"  ✓ Total Allocated Budget: SAR {analytics['total_allocated_budget']:,}")
    print(f"  ✓ Total Committed Task Cost: SAR {analytics['total_committed_task_cost']:,}")
    print(f"  ✓ Total Tasks: {analytics['total_tasks_count']} | Completed: {analytics['completed_tasks_count']}")
    print(f"  ✓ Total Hazards: {analytics['total_hazards_count']} | Mitigated: {analytics['mitigated_hazards_count']} | Active: {analytics['active_hazards_count']}")

    print("\n=================================================================")
    print(" ALL PLANNING MODULE AUTOMATED TESTS PASSED SUCCESSFULLY! (8/8)  ")
    print("=================================================================")

if __name__ == "__main__":
    test_planning_module()
