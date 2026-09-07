using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using OxenGL.Mobile.Models;

namespace OxenGL.Mobile.Services;

public class SyncEngineService : ISyncEngineService
{
    private readonly ILocalDatabaseService _db;
    private readonly ISecureStorageService _secureStorage;
    private readonly IApiClient _apiClient;
    private readonly string _defaultBaseUrl;

    public event EventHandler<SyncExecutionSummary>? SyncCompleted;
    public event EventHandler<string>? ConflictDetected;

    public bool IsSyncing { get; private set; }

    public SyncEngineService(
        ILocalDatabaseService db,
        ISecureStorageService secureStorage,
        IApiClient apiClient,
        string defaultBaseUrl = "http://127.0.0.1:8000")
    {
        _db = db;
        _secureStorage = secureStorage;
        _apiClient = apiClient;
        _defaultBaseUrl = defaultBaseUrl;
    }

    public async Task<SyncExecutionSummary> TriggerSyncAsync(string? overrideBaseUrl = null)
    {
        if (IsSyncing)
        {
            return new SyncExecutionSummary
            {
                IsSuccess = false,
                Message = "Sync is already in progress."
            };
        }

        IsSyncing = true;
        try
        {
            var pendingOps = await _db.GetPendingOperationsAsync();
            if (pendingOps == null || pendingOps.Count == 0)
            {
                var emptySummary = new SyncExecutionSummary
                {
                    IsSuccess = true,
                    Message = "Queue is empty. Everything is up to date."
                };
                SyncCompleted?.Invoke(this, emptySummary);
                return emptySummary;
            }

            var token = await _secureStorage.GetDeviceTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                var unauthSummary = new SyncExecutionSummary
                {
                    IsSuccess = false,
                    Message = "Device token missing. Please register the device before syncing."
                };
                SyncCompleted?.Invoke(this, unauthSummary);
                return unauthSummary;
            }

            var baseUrl = overrideBaseUrl ?? _defaultBaseUrl;

            // Prepare batch request
            var eventList = new List<SyncQueueEventDto>();
            foreach (var op in pendingOps)
            {
                object parsedPayload;
                try
                {
                    parsedPayload = JsonSerializer.Deserialize<JsonElement>(op.PayloadJson);
                }
                catch
                {
                    parsedPayload = op.PayloadJson;
                }

                eventList.Add(new SyncQueueEventDto
                {
                    OperationId = op.OperationId,
                    EntityType = op.EntityType,
                    Action = op.Action,
                    Payload = parsedPayload,
                    ClientTimestamp = op.CreatedAt.ToString("o")
                });
            }

            var batchRequest = new SyncBatchRequestDto
            {
                DeviceToken = token,
                Events = eventList
            };

            var response = await _apiClient.PushSyncBatchAsync(baseUrl, batchRequest);
            if (response == null)
            {
                // Network failure or backend unreachable
                foreach (var op in pendingOps)
                {
                    await _db.UpdateOperationStatusAsync(op.OperationId, SyncStatus.FAILED_RETRY, "Network connection unavailable.");
                }

                var netFailureSummary = new SyncExecutionSummary
                {
                    IsSuccess = false,
                    ProcessedCount = 0,
                    FailedCount = pendingOps.Count,
                    Message = "Sync failed: ERP server is unreachable. Commands remain safely queued offline."
                };
                SyncCompleted?.Invoke(this, netFailureSummary);
                return netFailureSummary;
            }

            // Process server-authoritative results
            int appliedCount = 0;
            int duplicateCount = 0;
            int conflictCount = 0;
            int failedCount = 0;

            foreach (var itemResult in response.Results)
            {
                if (itemResult.IsConflict || string.Equals(itemResult.Status, "REJECTED_CONFLICT", StringComparison.OrdinalIgnoreCase))
                {
                    conflictCount++;
                    await _db.UpdateOperationStatusAsync(
                        itemResult.OperationId, 
                        SyncStatus.REJECTED_CONFLICT, 
                        itemResult.ConflictReason, 
                        isConflict: true, 
                        conflictReason: itemResult.ConflictReason
                    );

                    ConflictDetected?.Invoke(this, $"Conflict on {itemResult.EntityType} [{itemResult.OperationId}]: {itemResult.ConflictReason}");
                }
                else if (string.Equals(itemResult.Status, "SKIPPED_DUPLICATE", StringComparison.OrdinalIgnoreCase))
                {
                    duplicateCount++;
                    await _db.UpdateOperationStatusAsync(
                        itemResult.OperationId, 
                        SyncStatus.SKIPPED_DUPLICATE, 
                        serverRecordId: itemResult.ServerRecordId
                    );
                }
                else if (string.Equals(itemResult.Status, "APPLIED", StringComparison.OrdinalIgnoreCase))
                {
                    appliedCount++;
                    await _db.UpdateOperationStatusAsync(
                        itemResult.OperationId, 
                        SyncStatus.APPLIED, 
                        serverRecordId: itemResult.ServerRecordId
                    );

                    // Update corresponding local entity cache
                    await UpdateLocalEntitySyncedStateAsync(itemResult);
                }
                else
                {
                    failedCount++;
                    await _db.UpdateOperationStatusAsync(
                        itemResult.OperationId, 
                        SyncStatus.FAILED_RETRY, 
                        itemResult.ConflictReason ?? "Operation rejected by server."
                    );
                }
            }

            var summary = new SyncExecutionSummary
            {
                IsSuccess = conflictCount == 0 && failedCount == 0,
                ProcessedCount = response.ProcessedCount,
                AppliedCount = appliedCount,
                ConflictCount = conflictCount,
                DuplicateCount = duplicateCount,
                FailedCount = failedCount,
                Message = $"Sync finished. Applied: {appliedCount}, Duplicates: {duplicateCount}, Conflicts: {conflictCount}, Failed: {failedCount}"
            };

            SyncCompleted?.Invoke(this, summary);
            return summary;
        }
        finally
        {
            IsSyncing = false;
        }
    }

    private async Task UpdateLocalEntitySyncedStateAsync(SyncBatchItemResultDto item)
    {
        if (string.Equals(item.EntityType, "farm_gate_weighment", StringComparison.OrdinalIgnoreCase))
        {
            var op = await _db.GetOperationByIdAsync(item.OperationId);
            if (op != null)
            {
                try
                {
                    using var doc = JsonDocument.Parse(op.PayloadJson);
                    if (doc.RootElement.TryGetProperty("local_id", out var localIdElem))
                    {
                        var localId = localIdElem.GetString();
                        if (!string.IsNullOrEmpty(localId))
                        {
                            var w = await _db.GetWeighmentByIdAsync(localId);
                            if (w != null)
                            {
                                w.IsSynced = true;
                                w.ServerId = item.ServerRecordId;
                                await _db.SaveWeighmentAsync(w);
                            }
                        }
                    }
                }
                catch { }
            }
        }
        else if (string.Equals(item.EntityType, "maintenance_work_order", StringComparison.OrdinalIgnoreCase))
        {
            var op = await _db.GetOperationByIdAsync(item.OperationId);
            if (op != null)
            {
                try
                {
                    using var doc = JsonDocument.Parse(op.PayloadJson);
                    if (doc.RootElement.TryGetProperty("local_id", out var localIdElem))
                    {
                        var localId = localIdElem.GetString();
                        if (!string.IsNullOrEmpty(localId))
                        {
                            var wo = await _db.GetWorkOrderByIdAsync(localId);
                            if (wo != null)
                            {
                                wo.IsSynced = true;
                                wo.ServerId = item.ServerRecordId;
                                await _db.SaveWorkOrderAsync(wo);
                            }
                        }
                    }
                }
                catch { }
            }
        }
    }
}
