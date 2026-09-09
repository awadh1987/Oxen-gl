using System;
using System.Threading.Tasks;

namespace OxenGL.Mobile.Services;

public class GpsLocationResult
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Altitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    public bool HasPermission { get; set; }
    public bool IsMockOrSimulated { get; set; }
    public string? ErrorMessage { get; set; }
}

public interface IGpsLocationService
{
    Task<bool> EnsurePermissionGrantedAsync();
    Task<GpsLocationResult> CaptureCurrentLocationAsync();
}
