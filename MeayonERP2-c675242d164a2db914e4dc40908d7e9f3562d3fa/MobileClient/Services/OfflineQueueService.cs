using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using OxenGL.Mobile.Models;

namespace OxenGL.Mobile.Services;

public class OfflineQueueService : IOfflineQueueService
{
    private readonly ILocalDatabaseService _db;

    public OfflineQueueService(ILocalDatabaseService db)
    {
        _db = db;
    }

    public async Task<string> QueuePodSubmissionAsync(PodCapturePayload pod)
    {
        if (pod == null) throw new ArgumentNullException(nameof(pod));
        if (string.IsNullOrEmpty(pod.TripId))
            throw new ArgumentException("Trip ID is required for Proof of Delivery submission.", nameof(pod));

        var opId = Guid.NewGuid().ToString();
        var jsonPayload = JsonSerializer.Serialize(pod);

        var queuedOp = new QueuedOperation
        {
            OperationId = opId,
            EntityType = "proof_of_delivery",
            Action = "create",
            PayloadJson = jsonPayload,
            Status = SyncStatus.PENDING,
            CreatedAt = DateTime.UtcNow
        };

        await _db.EnqueueOperationAsync(queuedOp);
        return opId;
    }

    public async Task<string> QueueWeighmentSubmissionAsync(LocalFarmGateWeighment weighment)
    {
        if (weighment == null) throw new ArgumentNullException(nameof(weighment));

        // Strict validation: net_weight must equal gross_weight - tare_weight
        var expectedNet = weighment.GrossWeight - weighment.TareWeight;
        if (Math.Abs(weighment.NetWeight - expectedNet) > 0.001)
        {
            throw new InvalidOperationException($"Net weight ({weighment.NetWeight:F2}) must exactly equal gross weight ({weighment.GrossWeight:F2}) - tare weight ({weighment.TareWeight:F2}). Discrepancy: {weighment.NetWeight - expectedNet:F2} kg.");
        }

        // Financial & Ledger Lockdown:
        // Offline financial approvals or invoice settlements are strictly prohibited.
        if (string.Equals(weighment.Status, "approved", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(weighment.Status, "posted", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Financial and inventory balance approvals cannot be executed offline. An active ERP server connection is required to certify weighment records.");
        }

        // Local copy is marked draft or pending
        if (string.IsNullOrEmpty(weighment.LocalId))
        {
            weighment.LocalId = Guid.NewGuid().ToString();
        }
        weighment.Status = "draft";
        await _db.SaveWeighmentAsync(weighment);

        var opId = Guid.NewGuid().ToString();
        var payloadObj = new
        {
            crop_cycle_id = weighment.CropCycleId,
            gross_weight = weighment.GrossWeight,
            tare_weight = weighment.TareWeight,
            net_weight = weighment.NetWeight,
            field_location_name = weighment.FieldLocationName,
            status = "draft",
            notes = weighment.Notes,
            local_id = weighment.LocalId
        };

        var queuedOp = new QueuedOperation
        {
            OperationId = opId,
            EntityType = "farm_gate_weighment",
            Action = "create",
            PayloadJson = JsonSerializer.Serialize(payloadObj),
            Status = SyncStatus.PENDING,
            CreatedAt = DateTime.UtcNow
        };

        await _db.EnqueueOperationAsync(queuedOp);
        return opId;
    }

    public async Task<string> QueueMaintenanceWorkOrderAsync(LocalMaintenanceWorkOrder workOrder)
    {
        if (workOrder == null) throw new ArgumentNullException(nameof(workOrder));
        if (workOrder.VehicleId <= 0)
            throw new ArgumentException("Valid vehicle ID is required for maintenance work orders.", nameof(workOrder));

        if (string.IsNullOrEmpty(workOrder.LocalId))
        {
            workOrder.LocalId = Guid.NewGuid().ToString();
        }
        workOrder.Status = "draft";
        await _db.SaveWorkOrderAsync(workOrder);

        var opId = Guid.NewGuid().ToString();
        var payloadObj = new
        {
            vehicle_id = workOrder.VehicleId,
            order_type = workOrder.OrderType ?? "inspection",
            priority = workOrder.Priority ?? "medium",
            description = workOrder.Description,
            odometer_reading = workOrder.OdometerReading,
            local_id = workOrder.LocalId
        };

        var queuedOp = new QueuedOperation
        {
            OperationId = opId,
            EntityType = "maintenance_work_order",
            Action = "create",
            PayloadJson = JsonSerializer.Serialize(payloadObj),
            Status = SyncStatus.PENDING,
            CreatedAt = DateTime.UtcNow
        };

        await _db.EnqueueOperationAsync(queuedOp);
        return opId;
    }

    public Task<List<QueuedOperation>> GetPendingQueueAsync()
    {
        return _db.GetPendingOperationsAsync();
    }

    public Task<List<QueuedOperation>> GetConflictAlertsAsync()
    {
        return _db.GetConflictOperationsAsync();
    }

    public Task<int> GetPendingCountAsync()
    {
        return _db.GetPendingCountAsync();
    }
}
