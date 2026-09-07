using System;
using SQLite;

namespace OxenGL.Mobile.Models;

/// <summary>
/// Cached fleet maintenance work orders recorded during field inspections or emergency roadside repairs.
/// </summary>
[Table("local_maintenance_work_orders")]
public class LocalMaintenanceWorkOrder
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Indexed]
    public string OrderNumber { get; set; } = string.Empty;

    public string VehicleId { get; set; } = string.Empty;
    public string VehiclePlate { get; set; } = string.Empty;

    public string OrderType { get; set; } = "emergency"; // "preventive", "corrective", "routine", "emergency", "inspection"
    public string Priority { get; set; } = "urgent";     // "low", "medium", "high", "urgent"
    public string Status { get; set; } = "draft";         // "draft", "in_progress", "completed", "cancelled"

    public decimal? OdometerReading { get; set; }
    public string Description { get; set; } = string.Empty;

    public string? AttachedPhotoPath { get; set; }
    public bool IsSynced { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
