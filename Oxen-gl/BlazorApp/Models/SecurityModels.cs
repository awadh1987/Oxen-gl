using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BlazorApp.Models
{
    public class UserInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "Guest";
        public string? CompanyId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class PasswordRotateModel
    {
        [JsonPropertyName("current_password")]
        public string? CurrentPassword { get; set; }

        [JsonPropertyName("new_password")]
        public string NewPassword { get; set; } = string.Empty;

        [JsonPropertyName("regenerate_recovery_codes")]
        public bool RegenerateRecoveryCodes { get; set; } = true;
    }

    public class PasswordRotateResult
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("recovery_codes")]
        public List<string> RecoveryCodes { get; set; } = new();
    }

    public class PlatformAuditLogItem
    {
        [JsonPropertyName("id")]
        public Guid Id { get; set; }

        [JsonPropertyName("actor_email")]
        public string ActorEmail { get; set; } = string.Empty;

        [JsonPropertyName("action")]
        public string Action { get; set; } = string.Empty;

        [JsonPropertyName("outcome")]
        public string Outcome { get; set; } = "SUCCESS";

        [JsonPropertyName("endpoint_accessed")]
        public string EndpointAccessed { get; set; } = string.Empty;

        [JsonPropertyName("request_id")]
        public string? RequestId { get; set; }

        [JsonPropertyName("ip_address")]
        public string? IpAddress { get; set; }

        [JsonPropertyName("company_id")]
        public Guid? CompanyId { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    public class TenantUserItem
    {
        [JsonPropertyName("id")]
        public Guid Id { get; set; }

        [JsonPropertyName("company_id")]
        public Guid CompanyId { get; set; }

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("full_name")]
        public string FullName { get; set; } = string.Empty;

        [JsonPropertyName("role")]
        public string Role { get; set; } = "Guest";

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    public class TenantUserRoleUpdateModel
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = "Guest";
    }

    public class TenantApiKeyModel
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("scopes")]
        public List<string> Scopes { get; set; } = new();

        [JsonPropertyName("expires_days")]
        public int ExpiresDays { get; set; } = 30;
    }

    public class TenantApiKeyResult
    {
        [JsonPropertyName("key_id")]
        public string KeyId { get; set; } = string.Empty;

        [JsonPropertyName("api_key")]
        public string ApiKey { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("scopes")]
        public List<string> Scopes { get; set; } = new();

        [JsonPropertyName("expires_at")]
        public DateTime ExpiresAt { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;
    }

    public class TenantSecuritySettingsModel
    {
        [JsonPropertyName("company_id")]
        public Guid CompanyId { get; set; }

        [JsonPropertyName("mfa_enforced")]
        public bool MfaEnforced { get; set; } = true;

        [JsonPropertyName("active_keys_count")]
        public int ActiveKeysCount { get; set; } = 0;
    }
}
