using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using OxenGL.Mobile.Models;

namespace OxenGL.Mobile.Services;

public class ApiClient : IApiClient
{
    private readonly HttpClient _httpClient;

    public ApiClient(HttpClient? httpClient = null)
    {
        _httpClient = httpClient ?? new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
    }

    public async Task<bool> CheckConnectionAsync(string baseUrl)
    {
        try
        {
            var url = $"{baseUrl.TrimEnd('/')}/health";
            var resp = await _httpClient.GetAsync(url);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<DeviceRegistrationResult> RegisterDeviceAsync(
        string baseUrl,
        string deviceId,
        string deviceName,
        string platform,
        int companyId,
        int? driverId = null)
    {
        try
        {
            var url = $"{baseUrl.TrimEnd('/')}/api/mobile/register";
            var payload = new
            {
                device_id = deviceId,
                device_name = deviceName,
                platform = platform.ToLowerInvariant(),
                app_version = "1.0.0",
                company_id = companyId,
                driver_id = driverId
            };

            var json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                return new DeviceRegistrationResult
                {
                    Success = false,
                    ErrorMessage = $"Registration failed ({response.StatusCode}): {body}"
                };
            }

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var token = root.GetProperty("device_token").GetString();
            var expiresAt = root.TryGetProperty("expires_at", out var expElem) && expElem.ValueKind != JsonValueKind.Null
                ? expElem.GetDateTime()
                : (DateTime?)null;

            return new DeviceRegistrationResult
            {
                Success = true,
                DeviceToken = token,
                Context = new DeviceAuthContext
                {
                    DeviceToken = token ?? "",
                    DeviceId = deviceId,
                    CompanyId = companyId,
                    DriverId = driverId,
                    IssuedAtUtc = DateTime.UtcNow,
                    ExpiresAtUtc = expiresAt
                }
            };
        }
        catch (Exception ex)
        {
            return new DeviceRegistrationResult
            {
                Success = false,
                ErrorMessage = $"Network or connection failure: {ex.Message}"
            };
        }
    }

    public async Task<SyncBatchResponseDto?> PushSyncBatchAsync(string baseUrl, SyncBatchRequestDto batch)
    {
        try
        {
            var url = $"{baseUrl.TrimEnd('/')}/api/mobile/sync";
            var json = JsonSerializer.Serialize(batch);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new SyncBatchResponseDto
                {
                    ProcessedCount = batch.Events.Count,
                    FailedCount = batch.Events.Count
                };
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<SyncBatchResponseDto>(body, options);
        }
        catch
        {
            return null;
        }
    }
}
