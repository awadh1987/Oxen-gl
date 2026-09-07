using System.Collections.Generic;
using System.Threading.Tasks;
using OxenGL.Mobile.Models;

namespace OxenGL.Mobile.Services;

public interface ILocalDatabaseService
{
    Task InitializeAsync();
    
    // Offline Queue
    Task<int> EnqueueOperationAsync(QueuedOperation operation);
    Task<List<QueuedOperation>> GetPendingOperationsAsync();
    Task<List<QueuedOperation>> GetConflictOperationsAsync();
    Task<QueuedOperation?> GetOperationByIdAsync(string operationId);
    Task UpdateOperationStatusAsync(string operationId, SyncStatus status, string? error = null, bool isConflict = false, string? conflictReason = null, int? serverRecordId = null);
    Task<int> GetPendingCountAsync();
    Task<int> GetConflictCountAsync();

    // Assigned Trips Cache
    Task<List<AssignedTripRecord>> GetTripsAsync();
    Task<AssignedTripRecord?> GetTripByIdAsync(string tripId);
    Task SaveTripAsync(AssignedTripRecord trip);
    Task SaveTripsAsync(IEnumerable<AssignedTripRecord> trips);

    // Farm Gate Weighments Cache
    Task<List<LocalFarmGateWeighment>> GetWeighmentsAsync();
    Task<LocalFarmGateWeighment?> GetWeighmentByIdAsync(string localId);
    Task SaveWeighmentAsync(LocalFarmGateWeighment weighment);

    // Maintenance Work Orders Cache
    Task<List<LocalMaintenanceWorkOrder>> GetWorkOrdersAsync();
    Task<LocalMaintenanceWorkOrder?> GetWorkOrderByIdAsync(string localId);
    Task SaveWorkOrderAsync(LocalMaintenanceWorkOrder order);

    // Maintenance / Purge
    Task ClearSyncedOperationsAsync(int daysToKeep = 7);
}
