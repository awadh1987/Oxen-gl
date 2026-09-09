#!/usr/bin/env python3
"""
End-to-End Automated Verification Test Suite for SaaS Multi-Tenant Platform Architecture.
Covers:
  1. Virtual Host Domain Routing & Tenant Resolution Middleware (Root, Master, Subdomain, Custom Domain CNAME)
  2. Master DevOps Control Panel (Cmd+K Global Search, Tenant Provisioning, Destructive Safety Guards, Feature Flags)
  3. Tenant Control Panel (Progressive Disclosure Settings, Team Member Invites, 3-Step Custom Domain Verification)
  4. Authoritative PostgreSQL Row-Level Security (RLS) Cross-Tenant Isolation
"""

import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.error
import psycopg2

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")
PG_DSN = os.environ.get("DATABASE_URL", "postgresql://oxengl:oxengl@localhost:5432/oxengl")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
_spawned_server_proc = None

def ensure_server_running():
    """Ensures Node.js edge server is up on BASE_URL; spawns it if running in CI environment."""
    global _spawned_server_proc
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/health", method="GET")
        with urllib.request.urlopen(req, timeout=2) as res:
            if res.status == 200:
                return
    except Exception:
        pass

    # Server not responding, spawn dist/server.cjs
    server_path = os.path.join(os.path.dirname(__file__), "dist", "server.cjs")
    if os.path.exists(server_path):
        print(f"[CI/CD] Spawning edge routing server from {server_path}...")
        _spawned_server_proc = subprocess.Popen(
            ["node", server_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=os.environ.copy()
        )
        for _ in range(30):
            time.sleep(1)
            try:
                req = urllib.request.Request(f"{BASE_URL}/api/health", method="GET")
                with urllib.request.urlopen(req, timeout=1) as res:
                    if res.status == 200:
                        print("[CI/CD] Edge routing server is operational.")
                        return
            except Exception:
                pass
        print("[CI/CD] Warning: Timed out waiting for spawned server.")


def http_request(path: str, method: str = "GET", data: dict = None, headers: dict = None):
    url = f"{BASE_URL}{path}"
    req_headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    
    encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode("utf-8")
            parsed = json.loads(body) if body else {}
            return status, parsed
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return status, parsed

def log_test(name, passed, details=""):
    badge = "PASS" if passed else "FAIL"
    print(f"[{badge}] {name}")
    if details:
        print(f"       -> {details}")
    if not passed:
        sys.exit(1)

def run_tests():
    print("=" * 70)
    print("STARTING SAAS MULTI-TENANT PLATFORM ARCHITECTURE VERIFICATION SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. DOMAIN ROUTING & TENANT RESOLUTION MIDDLEWARE
    # -------------------------------------------------------------
    print("\n--- 1. DOMAIN ROUTING & RESOLUTION ---")

    # 1.1 Root Plane Resolution
    status, data = http_request("/api/platform/resolve-tenant")
    log_test(
        "Root Plane Resolution (localhost)",
        status == 200 and data.get("plane") == "root" and data.get("tenant") is None,
        f"Plane: {data.get('plane')}"
    )

    # 1.2 Master Plane Resolution (admin.oxengl.com)
    status, data = http_request("/api/platform/resolve-tenant", headers={"Host": "admin.oxengl.com"})
    log_test(
        "Master Admin Plane Resolution (admin.oxengl.com)",
        status == 200 and data.get("plane") == "master" and data.get("tenant") is None,
        f"Plane: {data.get('plane')}"
    )

    # 1.3 Wildcard Subdomain Tenant Resolution (horizon-logistics.oxengl.com)
    status, data = http_request("/api/platform/resolve-tenant", headers={"Host": "horizon-logistics.oxengl.com"})
    tenant = data.get("tenant", {}) or {}
    log_test(
        "Wildcard Subdomain Resolution (horizon-logistics.oxengl.com)",
        status == 200 and data.get("plane") == "tenant" and tenant.get("slug") == "horizon-logistics",
        f"Tenant: {tenant.get('name')}, Tier: {tenant.get('tier')}, Theme: {tenant.get('theme', {}).get('primaryColor')}"
    )

    # 1.4 Custom Domain CNAME Resolution (custom-client-domain.com)
    status, data = http_request("/api/platform/resolve-tenant", headers={"Host": "custom-client-domain.com"})
    tenant = data.get("tenant", {}) or {}
    log_test(
        "Custom Domain CNAME Resolution (custom-client-domain.com)",
        status == 200 and data.get("plane") == "tenant" and tenant.get("slug") == "horizon-logistics",
        f"Resolved via Custom Domain Registry to: {tenant.get('slug')}"
    )

    # 1.5 Non-existent Tenant Subdomain
    status, data = http_request("/api/platform/resolve-tenant", headers={"Host": "nonexistent-tenant-999.oxengl.com"})
    log_test(
        "Unknown Tenant Subdomain Rejection (404 Not Found)",
        status == 404,
        f"Status: {status}, Error: {data.get('error')}"
    )

    # -------------------------------------------------------------
    # 2. MASTER PLATFORM CONTROLLER & DESTRUCTIVE SAFETY GUARDS
    # -------------------------------------------------------------
    print("\n--- 2. MASTER PLATFORM CONTROLLER & SAFETY GUARDS ---")

    # 2.1 System Health HUD
    status, health = http_request("/api/master/platform/health")
    log_test(
        "System Health Telemetry",
        status == 200 and health.get("status") == "operational" and health.get("uptime_percent", 0) > 99,
        f"Uptime: {health.get('uptime_percent')}%, Latency: {health.get('api_latency_ms')}ms, Cluster: {health.get('infrastructure', {}).get('cluster')}"
    )

    # 2.2 Cmd+K Global Omnibox Search
    status, search_data = http_request("/api/master/platform/search?q=horizon")
    results = search_data.get("results", {})
    log_test(
        "Cmd+K Global Search (Horizon query)",
        status == 200 and len(results.get("tenants", [])) > 0 and len(results.get("users", [])) > 0,
        f"Found {len(results.get('tenants', []))} tenants, {len(results.get('users', []))} users, {len(results.get('logs', []))} logs"
    )

    # 2.3 Tenant Provisioning
    prov_payload = {
        "name": "شركة الرياض للنقل الثقيل (Riyadh Heavy Haulage)",
        "slug": "riyadh-heavy",
        "plan_tier": "growth",
        "owner_email": "ops@riyadh-heavy.sa",
        "primary_color": "#10B981"
    }
    status, prov_data = http_request("/api/master/platform/tenants", method="POST", data=prov_payload)
    log_test(
        "Tenant Provisioning (riyadh-heavy)",
        status == 201 and prov_data.get("success") is True,
        f"Provisioned ID: {prov_data.get('tenant', {}).get('id')}, Slug: {prov_data.get('tenant', {}).get('slug')}"
    )
    new_tenant_id = prov_data.get("tenant", {}).get("id")

    # 2.4 Destructive Action Safety Guard (Missing/Wrong Confirm Phrase Rejection)
    status, err_data = http_request(f"/api/master/platform/tenants/{new_tenant_id}", method="DELETE", data={"confirm_phrase": "wrong-phrase"})
    log_test(
        "Destructive Action Guard: Reject Invalid Confirmation Phrase",
        status == 400 and ("Destructive safety check failed" in err_data.get("error", "") or "Invalid" in err_data.get("error", "")),
        f"Status: {status}, Error: {err_data.get('error')}"
    )

    # 2.5 Destructive Action Safety Guard: Authorized Deletion with CONFIRM-DELETE-{slug}
    status, del_data = http_request(f"/api/master/platform/tenants/{new_tenant_id}", method="DELETE", data={"confirm_phrase": "CONFIRM-DELETE-riyadh-heavy"})
    log_test(
        "Destructive Action Guard: Confirm Deletion with Exact Phrase",
        status == 200 and del_data.get("success") is True,
        f"Message: {del_data.get('message')}"
    )

    # 2.6 Global Feature Flags Read & Toggle
    status, flag_res = http_request("/api/master/platform/feature-flags")
    flags = flag_res.get("flags", {})
    prev_state = flags.get("custom_domains_v2", {}).get("enabled", True)

    # Toggle flag
    status, toggle_res = http_request("/api/master/platform/feature-flags/toggle", method="POST", data={
        "flag_key": "custom_domains_v2",
        "enabled": not prev_state
    })
    log_test(
        "Feature Flags Live Dynamic Toggle",
        status == 200 and toggle_res.get("success") is True,
        f"Toggled custom_domains_v2 to: {not prev_state}"
    )

    # Restore flag
    http_request("/api/master/platform/feature-flags/toggle", method="POST", data={
        "flag_key": "custom_domains_v2",
        "enabled": prev_state
    })

    # -------------------------------------------------------------
    # 3. TENANT CONTROL PANEL & CUSTOM DOMAIN WORKFLOW
    # -------------------------------------------------------------
    print("\n--- 3. TENANT CONTROL PANEL & DOMAINS ---")
    TENANT_ID = "6ab52593-ab47-4eee-8779-0cdfbb2762da"
    tenant_headers = {"x-tenant-id": TENANT_ID}

    # 3.1 List Team Members
    status, team_data = http_request("/api/tenant/control/team", headers=tenant_headers)
    log_test(
        "Tenant Team Members Query",
        status == 200 and len(team_data.get("team", [])) >= 3,
        f"Total Team Members: {len(team_data.get('team', []))}"
    )

    # 3.2 Invite New Team Member
    unique_email = f"tariq_{int(time.time())}@horizon.sa"
    invite_payload = {
        "full_name": "طارق المطيري",
        "email": unique_email,
        "role": "accountant",
        "department": "Finance & ZATCA"
    }
    status, inv_data = http_request("/api/tenant/control/team/invite", method="POST", headers=tenant_headers, data=invite_payload)
    log_test(
        "Tenant Team Member Invite",
        status == 201 and inv_data.get("success") is True,
        f"Invited: {inv_data.get('member', {}).get('full_name')} ({inv_data.get('member', {}).get('role')}) - {unique_email}"
    )


    # 3.3 Progressive Disclosure Settings Query & Update
    status, sett_data = http_request("/api/tenant/control/settings", headers=tenant_headers)
    log_test(
        "Progressive Disclosure Settings Retrieval",
        status == 200 and "general" in sett_data.get("settings", {}) and "webhooks" in sett_data.get("settings", {}),
        f"Sections: {list(sett_data.get('settings', {}).keys())}"
    )

    # Update Webhook Section
    webhook_update = {
        "section": "webhooks",
        "settings": {
            "enabled": True,
            "endpoint_url": "https://api.horizon.sa/webhooks/fleet",
            "secret_key": "whsec_horizon_production_992"
        }
    }
    status, upd_data = http_request("/api/tenant/control/settings", method="POST", headers=tenant_headers, data=webhook_update)
    log_test(
        "Progressive Disclosure Webhook Settings Update",
        status == 200 and upd_data.get("success") is True,
        f"Updated endpoint: {upd_data.get('settings', {}).get('webhooks', {}).get('endpoint_url')}"
    )

    # 3.4 Custom Domain Registration (Step 1 of Wizard)
    dyn_domain = f"portal-{int(time.time())}.horizon.sa"
    dom_payload = {"domain_name": dyn_domain}
    status, dom_data = http_request("/api/tenant/control/domains", method="POST", headers=tenant_headers, data=dom_payload)
    log_test(
        "Custom Domain Registration (Step 1)",
        status == 201 and dom_data.get("success") is True,
        f"Registered: {dom_data.get('domain', {}).get('domain_name')}, CNAME: {dom_data.get('domain', {}).get('cname_target')}"
    )
    domain_id = dom_data.get("domain", {}).get("id")


    # 3.5 Custom Domain DNS & SSL Automated Verification (Step 3 of Wizard)
    status, ver_data = http_request(f"/api/tenant/control/domains/{domain_id}/verify", method="POST", headers=tenant_headers)
    log_test(
        "Custom Domain DNS & SSL Verification (Step 3)",
        status == 200 and ver_data.get("success") is True and ver_data.get("ssl_status") == "active",
        f"DNS Check: {ver_data.get('dns_check')}, SSL Status: {ver_data.get('ssl_status')}, Routing: {ver_data.get('routing')}"
    )

    # -------------------------------------------------------------
    # 4. POSTGRESQL ROW-LEVEL SECURITY (RLS) DATA ISOLATION
    # -------------------------------------------------------------
    print("\n--- 4. POSTGRESQL ROW-LEVEL SECURITY ISOLATION ---")
    try:
        conn = psycopg2.connect(PG_DSN)
        cur = conn.cursor()

        # 4.1 Query under Horizon Logistics Tenant ID
        cur.execute("SET LOCAL app.current_tenant_id = '6ab52593-ab47-4eee-8779-0cdfbb2762da';")
        cur.execute("SELECT domain_name, is_verified, ssl_status FROM tenant_domains;")
        horizon_domains = cur.fetchall()
        log_test(
            "PostgreSQL RLS: Horizon Logistics Tenant Scope",
            len(horizon_domains) >= 2,
            f"Horizon sees {len(horizon_domains)} domains: {[d[0] for d in horizon_domains]}"
        )

        # 4.2 Query under Isolated Foreign Tenant ID
        cur.execute("SET LOCAL app.current_tenant_id = '99999999-9999-9999-9999-999999999999';")
        cur.execute("SELECT domain_name, is_verified, ssl_status FROM tenant_domains;")
        foreign_domains = cur.fetchall()
        log_test(
            "PostgreSQL RLS: Zero-Leakage Cross-Tenant Isolation",
            len(foreign_domains) == 0,
            f"Foreign tenant sees {len(foreign_domains)} domains (Strict 100% Isolation)"
        )

        # 4.3 Connection Pool Scoping: clear_tenant_context() resets session variable
        cur.execute("SELECT clear_tenant_context();")
        cur.execute("SELECT domain_name FROM tenant_domains;")
        cleared_domains = cur.fetchall()
        log_test(
            "Connection Pool Scoping: Session Variable Reset (Zero Contamination)",
            len(cleared_domains) == 0,
            f"Cleared context returned {len(cleared_domains)} rows on pooled connection"
        )

        cur.close()
        conn.close()
    except Exception as e:
        log_test("PostgreSQL RLS Database Verification", False, str(e))

    # -------------------------------------------------------------
    # 5. REDIS CACHE INVALIDATION SAFEGUARD
    # -------------------------------------------------------------
    print("\n--- 5. REDIS CACHE INVALIDATION SAFEGUARD ---")
    temp_domain = "temp-cache-test.horizon.sa"
    s_reg, b_reg = http_request("/api/tenant/control/domains", method="POST", headers=tenant_headers, data={"domain_name": temp_domain})
    if s_reg == 201:
        dom_id = b_reg.get("domain", {}).get("id")
        s_ver, b_ver = http_request(f"/api/tenant/control/domains/{dom_id}/verify", method="POST", headers=tenant_headers)
        s_res, b_res = http_request("/api/platform/resolve-tenant", headers={"Host": temp_domain})
        log_test(
            "Redis Cache Invalidation: Real-time Host Invalidation & Immediate Route Resolution",
            s_res == 200 and b_res.get("tenant", {}).get("slug") == "horizon-logistics",
            f"Resolved newly verified domain '{temp_domain}' -> {b_res.get('tenant', {}).get('slug')}"
        )
    else:
        # Domain already registered from prior test run, test direct resolution
        s_res, b_res = http_request("/api/platform/resolve-tenant", headers={"Host": temp_domain})
        log_test(
            "Redis Cache Invalidation: Route Resolution Verification",
            s_res == 200 and b_res.get("tenant", {}).get("slug") == "horizon-logistics",
            f"Resolved existing domain '{temp_domain}' -> {b_res.get('tenant', {}).get('slug')}"
        )

    print("\n" + "=" * 70)
    print("ALL SAAS MULTI-TENANT ARCHITECTURE TESTS PASSED SUCCESSFULLY! (100%)")
    print("=" * 70)

if __name__ == "__main__":
    ensure_server_running()
    try:
        run_tests()
    finally:
        if _spawned_server_proc:
            try:
                _spawned_server_proc.terminate()
                _spawned_server_proc.wait(timeout=2)
            except Exception:
                pass

