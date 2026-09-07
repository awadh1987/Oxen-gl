import json
import urllib.request
import urllib.error
import sys

BASE = 'http://127.0.0.1:8000'

def req(path, method='GET', body=None, headers=None):
    if headers is None:
        headers = {}
    data = None
    if body is not None:
        data = json.dumps(body).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    r = urllib.request.Request(f'{BASE}{path}', data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            content = resp.read().decode('utf-8')
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as err:
        err_content = err.read().decode('utf-8')
        try:
            parsed = json.loads(err_content)
        except Exception:
            parsed = {'raw': err_content}
        return err.code, parsed

print('1. Testing Master Login with Email...')
s1, b1 = req('/api/auth/master/login', 'POST', {'identity': 'superadmin@oxengl.com', 'password': 'OxenGL#IEhHsza7wOxH8DZj!2026'})
print('-> Status:', s1, 'Tier:', b1.get('tier'), 'Role:', b1.get('role'))
assert s1 == 200, b1
master_token = b1['access_token']

print('2. Testing Master Login with Saudi Mobile (0500000001)...')
s2, b2 = req('/api/auth/master-login', 'POST', {'identity': '0500000001', 'password': 'OxenGL#IEhHsza7wOxH8DZj!2026'})
print('-> Status:', s2, 'Tier:', b2.get('tier'), 'Role:', b2.get('role'))
assert s2 == 200, b2

print('3. Testing Tenant Registration (/api/auth/register-tenant)...')
s3, b3 = req('/api/auth/register-tenant', 'POST', {
    'company_name': 'Horizon Logistics KSA',
    'tenant_slug': 'horizon-logistics',
    'owner_full_name': 'Khaled Al-Otaibi',
    'email': 'khaled@horizon.sa',
    'mobile_number': '0555123456',
    'password': 'SecurePassword#2026',
    'commercial_registration': '1010887766',
    'tax_id': '300088776600003'
})
print('-> Status:', s3, 'Slug:', b3.get('tenant_slug', b3.get('detail')))
assert s3 in (200, 201, 409), b3

print('4. Testing Tenant Login with Email...')
s4, b4 = req('/api/auth/tenant/login', 'POST', {
    'workspace_slug': 'horizon-logistics',
    'identity': 'khaled@horizon.sa',
    'password': 'SecurePassword#2026'
})
print('-> Status:', s4, 'Tier:', b4.get('tier'), 'Role:', b4.get('role'), 'Slug:', b4.get('tenant_slug'))
assert s4 == 200, b4
tenant_token = b4['access_token']

print('5. Testing Tenant Login with Mobile (0555123456)...')
s5, b5 = req('/api/auth/tenant-login', 'POST', {
    'workspace_slug': 'horizon-logistics',
    'identity': '0555123456',
    'password': 'SecurePassword#2026'
})
print('-> Status:', s5, 'Tier:', b5.get('tier'), 'Role:', b5.get('role'))
assert s5 == 200, b5

print('6. Testing Password Recovery OTP request (/api/auth/recover-password)...')
s6, b6 = req('/api/auth/recover-password', 'POST', {
    'plane': 'tenant',
    'workspace_slug': 'horizon-logistics',
    'identity': 'khaled@horizon.sa'
})
print('-> Status:', s6, 'Message:', b6.get('message'), 'Reset Token Issued:', bool(b6.get('reset_token')))
assert s6 == 200, b6

print('7. Testing Cross-Plane Isolation (Tenant Token -> Master /api/auth/master/me)...')
s7, b7 = req('/api/auth/master/me', 'GET', headers={'Authorization': f'Bearer {tenant_token}'})
print('-> Status:', s7, 'Detail:', b7.get('detail'))
assert s7 == 403, f'Expected 403, got {s7}: {b7}'

print('8. Testing Cross-Plane Isolation (Master Token -> Tenant /api/auth/tenant/me)...')
s8, b8 = req('/api/auth/tenant/me', 'GET', headers={'Authorization': f'Bearer {master_token}', 'X-Tenant-Slug': 'horizon-logistics'})
print('-> Status:', s8, 'Detail:', b8.get('detail'))
assert s8 == 403, f'Expected 403, got {s8}: {b8}'

print('\n======================================================')
print('  ALL TWO-TIER AUTHENTICATION FLOWS VERIFIED 100%!   ')
print('======================================================')
