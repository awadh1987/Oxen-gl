using System;
using BlazorApp.Models;

namespace BlazorApp.Services
{
    public class TenantContextService
    {
        public Guid ActiveTenantId { get; private set; } = Guid.Parse("33bfeb77-9f5b-4222-9fb6-ee791feee3c1");
        public string ActiveTenantName { get; private set; } = "Meayon Central Logistics";

        public UserInfo CurrentUser { get; private set; } = new UserInfo
        {
            Id = "06cee290-7513-4d66-8c9b-597abd85478b",
            Email = "testadmin@oxengl.com",
            FullName = "Financial Test Admin",
            Role = "Super_Admin",
            CompanyId = "33bfeb77-9f5b-4222-9fb6-ee791feee3c1",
            IsActive = true
        };

        public event Action? OnChange;

        public bool IsSuperAdmin => string.Equals(CurrentUser.Role, "Super_Admin", StringComparison.OrdinalIgnoreCase);
        public bool IsTenantAdmin => IsSuperAdmin || string.Equals(CurrentUser.Role, "Admin", StringComparison.OrdinalIgnoreCase);

        public void SetTenant(Guid tenantId, string name = "Selected Tenant")
        {
            ActiveTenantId = tenantId;
            ActiveTenantName = name;
            NotifyStateChanged();
        }

        public void SetCurrentUser(UserInfo user)
        {
            CurrentUser = user;
            if (!string.IsNullOrEmpty(user.CompanyId) && Guid.TryParse(user.CompanyId, out var parsedCompanyId))
            {
                ActiveTenantId = parsedCompanyId;
            }
            NotifyStateChanged();
        }

        private void NotifyStateChanged() => OnChange?.Invoke();
    }
}
