using System;
using System.Collections.Generic;

namespace OxenGL.Mobile.Models;

/// <summary>
/// Geolocation and Proof of Delivery (POD) payload captured during delivery confirmation.
/// </summary>
public class PodCapturePayload
{
    public string TripId { get; set; } = string.Empty;
    public string TripNumber { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;

    // GPS Telemetry
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Altitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public DateTime GpsTimestamp { get; set; } = DateTime.UtcNow;

    // Encrypted photo metadata & hashes
    public List<string> EncryptedPhotoFilePaths { get; set; } = new();
    public string? DigitalSignatureData { get; set; }
    public string? DeliveryNotes { get; set; }
    public DateTime DeliveredAt { get; set; } = DateTime.UtcNow;
}
