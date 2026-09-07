using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using SQLite;
using OxenGL.Mobile.Models;

namespace OxenGL.Mobile.Services;

public class LocalDatabaseService : ILocalDatabaseService
{
    private SQLiteAsyncConnection? _database;
    private readonly string _dbPath;
    private bool _isInitialized;

    public LocalDatabaseService(string? customDbPath = null)
    {
        if (!string.IsNullOrEmpty(customDbPath))
        {
            _dbPath = customDbPath;
        }
        else
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var dir = Path.Combine(appData, "OxenGL");
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            _dbPath = Path.Combine(dir, "oxengl_offline.db3");
        }
    }

    public async Task InitializeAsync()
    {
        if (_isInitialized && _database != null)
            return;

        _database = new SQLiteAsyncConnection(_dbPath, SQLiteOpenFlags.ReadWrite | SQLiteOpenFlags.Create | SQLiteOpenFlags.FullMutex);

        await _database.CreateTableAsync<QueuedOperation>();
        await _database.CreateTableAsync<AssignedTripRecord>();
        await _database.CreateTableAsync<LocalFarmGateWeighment>();
        await _database.CreateTableAsync<LocalMaintenanceWorkOrder>();

        _isInitialized = true;
    }

    private async Task EnsureInitializedAsync()
    {
        if (!_isInitialized || _database == null)
        {
            await InitializeAsync();
        }
    }

    public async Task<int> EnqueueOperationAsync(QueuedOperation operation)
    {
        await EnsureInitializedAsync();
        if (string.IsNullOrEmpty(operation.OperationId))
        {
            operation.OperationId = Guid.NewGuid().ToString();
        }
        operation.CreatedAt = DateTime.UtcNow;
        operation.Status = SyncStatus.PENDING;
        return await _database!.InsertOrReplaceAsync(operation);
    }

    public async Task<List<QueuedOperation>> GetPendingOperationsAsync()
    {
        await EnsureInitializedAsync();
        return await _database!.Table<QueuedOperation>()
            .Where(x => x.Status == SyncStatus.PENDING || x.Status == SyncStatus.FAILED_RETRY)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<QueuedOperation>> GetConflictOperationsAsync()
    {
        await EnsureInitializedAsync();
        return await _database!.Table<QueuedOperation>()
            .Where(x => x.IsConflict || x.Status == SyncStatus.REJECTED_CONFLICT)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<QueuedOperation?> GetOperationByIdAsync(string operationId)
    {
        await EnsureInitializedAsync();
        return await _database!.Table<QueuedOperation>()
            .FirstOrDefaultAsync(x => x.OperationId == operationId);
    }

    public async Task UpdateOperationStatusAsync(
        string operationId, 
        SyncStatus status, 
        string? error = null, 
        bool isConflict = false, 
        string? conflictReason = null, 
        int? serverRecordId = null)
    {
        await EnsureInitializedAsync();
        var existing = await GetOperationByIdAsync(operationId);
        if (existing != null)
        {
            existing.Status = status;
            existing.SyncedAt = DateTime.UtcNow;
            existing.ErrorMessage = error;
            existing.IsConflict = isConflict;
            existing.ConflictReason = conflictReason;
            if (serverRecordId.HasValue)
            {
                existing.ServerRecordId = serverRecordId.Value;
            }
            await _database!.UpdateAsync(existing);
        }
    }

    public async Task<int> GetPendingCountAsync()
    {
        await EnsureInitializedAsync();
        return await _database!.Table<QueuedOperation>()
            .Where(x => x.Status == SyncStatus.PENDING || x.Status == SyncStatus.FAILED_RETRY)
            .CountAsync();
    }

    public async Task<int> GetConflictCountAsync()
    {
        await EnsureInitializedAsync();
        return await _database!.Table<QueuedOperation>()
            .Where(x => x.IsConflict || x.Status == SyncStatus.REJECTED_CONFLICT)
            .CountAsync();
    }

    public async Task<List<AssignedTripRecord>> GetTripsAsync()
    {
        await EnsureInitializedAsync();
        return await _database!.Table<AssignedTripRecord>()
            .OrderByDescending(x => x.ScheduledStart)
            .ToListAsync();
    }

    public async Task<AssignedTripRecord?> GetTripByIdAsync(string tripId)
    {
        await EnsureInitializedAsync();
        return await _database!.Table<AssignedTripRecord>()
            .FirstOrDefaultAsync(x => x.TripId == tripId);
    }

    public async Task SaveTripAsync(AssignedTripRecord trip)
    {
        await EnsureInitializedAsync();
        await _database!.InsertOrReplaceAsync(trip);
    }

    public async Task SaveTripsAsync(IEnumerable<AssignedTripRecord> trips)
    {
        await EnsureInitializedAsync();
        await _database!.RunInTransactionAsync(conn =>
        {
            foreach (var trip in trips)
            {
                conn.InsertOrReplace(trip);
            }
        });
    }

    public async Task<List<LocalFarmGateWeighment>> GetWeighmentsAsync()
    {
        await EnsureInitializedAsync();
        return await _database!.Table<LocalFarmGateWeighment>()
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<LocalFarmGateWeighment?> GetWeighmentByIdAsync(string localId)
    {
        await EnsureInitializedAsync();
        return await _database!.Table<LocalFarmGateWeighment>()
            .FirstOrDefaultAsync(x => x.LocalId == localId);
    }

    public async Task SaveWeighmentAsync(LocalFarmGateWeighment weighment)
    {
        await EnsureInitializedAsync();
        await _database!.InsertOrReplaceAsync(weighment);
    }

    public async Task<List<LocalMaintenanceWorkOrder>> GetWorkOrdersAsync()
    {
        await EnsureInitializedAsync();
        return await _database!.Table<LocalMaintenanceWorkOrder>()
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<LocalMaintenanceWorkOrder?> GetWorkOrderByIdAsync(string localId)
    {
        await EnsureInitializedAsync();
        return await _database!.Table<LocalMaintenanceWorkOrder>()
            .FirstOrDefaultAsync(x => x.LocalId == localId);
    }

    public async Task SaveWorkOrderAsync(LocalMaintenanceWorkOrder order)
    {
        await EnsureInitializedAsync();
        await _database!.InsertOrReplaceAsync(order);
    }

    public async Task ClearSyncedOperationsAsync(int daysToKeep = 7)
    {
        await EnsureInitializedAsync();
        var cutoff = DateTime.UtcNow.AddDays(-daysToKeep);
        var oldSynced = await _database!.Table<QueuedOperation>()
            .Where(x => (x.Status == SyncStatus.APPLIED || x.Status == SyncStatus.SKIPPED_DUPLICATE) && x.SyncedAt < cutoff)
            .ToListAsync();

        foreach (var item in oldSynced)
        {
            await _database.DeleteAsync(item);
        }
    }
}
