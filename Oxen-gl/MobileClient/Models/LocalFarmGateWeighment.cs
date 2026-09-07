using System;
using SQLite;

namespace OxenGL.Mobile.Models;

/// <summary>
/// Cached agricultural weighment forms logged locally at remote farm gates.
/// </summary>
[Table("local_farm_gate_weighments")]
public class LocalFarmGateWeighment
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Indexed]
    public string TicketNumber { get; set; } = string.Empty;

    public string HarvestBatchId { get; set; } = string.Empty;
    public string? VehicleId { get; set; }
    public string? TransporterId { get; set; }
    public string? FarmerId { get; set; }

    public DateTime WeighmentDate { get; set; } = DateTime.UtcNow;
    public decimal GrossWeight { get; set; }
    public decimal TareWeight { get; set; }
    public decimal NetWeight { get; set; }

    public string? FieldLocationName { get; set; }
    public string Status { get; set; } = "draft"; // "draft", "pending", "approved", "locked"
    public string? Notes { get; set; }

    public bool IsSynced { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
