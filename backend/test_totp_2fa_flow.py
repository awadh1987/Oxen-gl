import json
import urllib.request
import pyotp

BASE_URL = "http://127.0.0.1:8000"

def make_request(path, data):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

print("=== STEP 1: 2FA Setup ===")
email = "muath.salaih@meayon.com"
workspace = "myon"
status_code, setup_res = make_request("/auth/2fa/setup", {
    "email": email,
    "workspace_slug": workspace
})
print("Setup Status:", status_code)
print("Setup Response:", setup_res)
assert setup_res.get("status") == "SETUP_INITIATED"
secret = setup_res["secret"]
auth_url = setup_res["totp_auth_url"]
assert secret and len(secret) == 32
assert "otpauth://" in auth_url

print("\n=== STEP 2: 2FA Verify (Enabling 2FA) ===")
code = pyotp.TOTP(secret).now()
print(f"Generated TOTP Code: {code}")
status_code, verify_res = make_request("/auth/2fa/verify", {
    "email": email,
    "workspace_slug": workspace,
    "code": code
})
print("Verify Status:", status_code)
print("Verify Response:", verify_res)
assert verify_res.get("status") in ("SUCCESS", "2FA_ACTIVATED")
assert verify_res.get("tfa_enabled") is True

print("\n=== STEP 3: Tenant Login Checkpoint (Expecting 2FA_REQUIRED) ===")
status_code, login_res = make_request("/api/auth/tenant/login", {
    "workspace_slug": workspace,
    "identity": email,
    "password": "Meayon123!"
})
print("Login Status:", status_code)
print("Login Response:", login_res)
assert login_res.get("status") == "2FA_REQUIRED"
two_factor_token = login_res.get("two_factor_token")
assert two_factor_token, "Expected two_factor_token in response"

print("\n=== STEP 4: 2FA Verify via Handshake Token (Completing Login) ===")
fresh_code = pyotp.TOTP(secret).now()
status_code, verify_login_res = make_request("/auth/2fa/verify", {
    "two_factor_token": two_factor_token,
    "code": fresh_code
})
print("Verify Handshake Status:", status_code)
print("Verify Handshake Response:", verify_login_res)
assert verify_login_res.get("status") == "SUCCESS"
assert "access_token" in verify_login_res
assert verify_login_res["token_type"] == "bearer"

print("\n🎉 ALL 4 TOTP 2FA STEPS PASSED SUCCESSFULLY! 🎉")
