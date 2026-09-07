using System;

namespace OxenGL.Mobile.Models;

/// <summary>
/// Cached security and tenant authorization context adhering to the Minimum Necessary Data policy.
/// Only minimal operational tokens are held locally in encrypted storage.
/// </summary>
public class DeviceAuthContext
{
    public Guid CompanyId { get; set; }
    public Guid? UserId { get; set; }
    public string DeviceToken { get; set; } = string.Empty;
    public string DriverFullName { get; set; } = string.Empty;
    public string DriverEmail { get; set; } = string.Empty;
    public string AppVersion { get; set; } = "v1.0.0-field";
    public DateTime LastSyncTime { get; set; } = DateTime.UtcNow;
    public bool IsRevoked { get; set; }
}
