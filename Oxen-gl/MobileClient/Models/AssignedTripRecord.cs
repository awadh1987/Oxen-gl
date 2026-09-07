using System;
using SQLite;

namespace OxenGL.Mobile.Models;

/// <summary>
/// Local SQLite cached record of driver assigned transport trips.
/// </summary>
[Table("assigned_trips")]
public class AssignedTripRecord
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Indexed]
    public string TripNumber { get; set; } = string.Empty;

    public string VehicleId { get; set; } = string.Empty;
    public string VehiclePlate { get; set; } = string.Empty;

    public string OriginLocation { get; set; } = string.Empty;
    public string DestinationLocation { get; set; } = string.Empty;

    public string CargoDescription { get; set; } = string.Empty;
    public decimal PlannedWeightTons { get; set; }

    public string Status { get; set; } = "assigned"; // "assigned", "in_transit", "delivered", "exception"
    public bool IsDelivered { get; set; }

    public DateTime? ScheduledDeparture { get; set; }
    public DateTime? ActualDeparture { get; set; }
    public DateTime? ActualDelivery { get; set; }

    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}
