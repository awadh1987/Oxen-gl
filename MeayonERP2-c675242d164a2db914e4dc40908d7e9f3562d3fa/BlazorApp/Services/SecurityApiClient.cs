using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using BlazorApp.Models;

namespace BlazorApp.Services
{
    public class SecurityApiClient
    {
        private readonly HttpClient _http;
        private readonly TenantContextService _tenantContext;

        public SecurityApiClient(HttpClient http, TenantContextService tenantContext)
        {
            _http = http;
            _tenantContext = tenantContext;
        }

        private void ApplyTenantHeaders(HttpRequestMessage request)
        {
            request.Headers.Remove("X-Company-ID");
            request.Headers.Add("X-Company-ID", _tenantContext.ActiveTenantId.ToString());
        }

        // ==========================================
        // Master Platform Security (Super_Admin Only)
        // ==========================================

        public async Task<PasswordRotateResult> RotateSuperAdminPasswordAsync(PasswordRotateModel model)
        {
            var response = await _http.PostAsJsonAsync("/api/platform/security/password-rotate", model);
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"Password rotation failed ({response.StatusCode}): {errorText}", null, response.StatusCode);
            }
            return await response.Content.ReadFromJsonAsync<PasswordRotateResult>()
                   ?? throw new InvalidOperationException("Empty response from password rotation endpoint");
        }

        public async Task<List<PlatformAuditLogItem>> GetPlatformAuditLogsAsync(int limit = 100)
        {
            var response = await _http.GetAsync($"/api/platform/security/audit-logs?limit={limit}");
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"Failed to load audit logs ({response.StatusCode}): {errorText}", null, response.StatusCode);
            }
            return await response.Content.ReadFromJsonAsync<List<PlatformAuditLogItem>>() ?? new List<PlatformAuditLogItem>();
        }

        // ==========================================
        // Tenant Security (TenantContext Isolated)
        // ==========================================

        public async Task<List<TenantUserItem>> GetTenantUsersAsync()
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/tenant/users");
            ApplyTenantHeaders(request);

            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"Failed to load tenant users ({response.StatusCode}): {errorText}", null, response.StatusCode);
            }
            return await response.Content.ReadFromJsonAsync<List<TenantUserItem>>() ?? new List<TenantUserItem>();
        }

        public async Task<TenantUserItem> UpdateTenantUserRoleAsync(Guid userId, string newRole)
        {
            using var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/tenant/users/{userId}/role")
            {
                Content = JsonContent.Create(new TenantUserRoleUpdateModel { Role = newRole })
            };
            ApplyTenantHeaders(request);

            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"Failed to update tenant user role ({response.StatusCode}): {errorText}", null, response.StatusCode);
            }
            return await response.Content.ReadFromJsonAsync<TenantUserItem>()
                   ?? throw new InvalidOperationException("Empty response from role update endpoint");
        }

        public async Task<TenantApiKeyResult> CreateTenantApiKeyAsync(TenantApiKeyModel model)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/tenant/security/api-keys")
            {
                Content = JsonContent.Create(model)
            };
            ApplyTenantHeaders(request);

            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"Failed to generate tenant API key ({response.StatusCode}): {errorText}", null, response.StatusCode);
            }
            return await response.Content.ReadFromJsonAsync<TenantApiKeyResult>()
                   ?? throw new InvalidOperationException("Empty response from API key creation endpoint");
        }

        public async Task<TenantSecuritySettingsModel> UpdateTenantSecuritySettingsAsync(bool mfaEnforced)
        {
            using var request = new HttpRequestMessage(HttpMethod.Patch, "/api/tenant/security/settings")
            {
                Content = JsonContent.Create(new { mfa_enforced = mfaEnforced })
            };
            ApplyTenantHeaders(request);

            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"Failed to update tenant security settings ({response.StatusCode}): {errorText}", null, response.StatusCode);
            }
            return await response.Content.ReadFromJsonAsync<TenantSecuritySettingsModel>()
                   ?? throw new InvalidOperationException("Empty response from security settings endpoint");
        }
    }
}
