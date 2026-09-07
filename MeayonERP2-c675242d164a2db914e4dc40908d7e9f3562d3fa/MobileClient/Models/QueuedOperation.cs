using System;
using SQLite;

namespace OxenGL.Mobile.Models;

/// <summary>
/// Represents an offline queued command to be synchronized with the central ERP backend.
/// Uses unique OperationId to ensure strict idempotency on the server.
/// </summary>
[Table("queued_operations")]
public class QueuedOperation
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    [Indexed(Unique = true)]
    public string OperationId { get; set; } = string.Empty;

    [Indexed]
    public string EntityType { get; set; } = string.Empty; // e.g. "farm_gate_weighment", "maintenance_work_order", "proof_of_delivery"

    public string Action { get; set; } = "create"; // "create", "update", "delete"

    public string PayloadJson { get; set; } = "{}";

    public DateTime ClientTimestamp { get; set; } = DateTime.UtcNow;

    [Indexed]
    public string SyncStatus { get; set; } = "PENDING"; // "PENDING", "SYNCING", "APPLIED", "REJECTED_CONFLICT", "FAILED"

    public bool IsConflict { get; set; }

    public string? ConflictReason { get; set; }

    public int RetryCount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? SyncedAt { get; set; }
}
