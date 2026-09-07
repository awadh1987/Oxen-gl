using System.Threading.Tasks;
using OxenGL.Mobile.Models;

namespace OxenGL.Mobile.Services;

public class DeviceRegistrationResult
{
    public bool Success { get; set; }
    public string? DeviceToken { get; set; }
    public string? ErrorMessage { get; set; }
    public DeviceAuthContext? Context { get; set; }
}

public interface IApiClient
{
    Task<DeviceRegistrationResult> RegisterDeviceAsync(string baseUrl, string deviceId, string deviceName, string platform, int companyId, int? driverId = null);
    Task<SyncBatchResponseDto?> PushSyncBatchAsync(string baseUrl, SyncBatchRequestDto batch);
    Task<bool> CheckConnectionAsync(string baseUrl);
}
