using System;
using System.Threading.Tasks;

namespace OxenGL.Mobile.Services;

public class SyncExecutionSummary
{
    public bool IsSuccess { get; set; }
    public int ProcessedCount { get; set; }
    public int AppliedCount { get; set; }
    public int ConflictCount { get; set; }
    public int DuplicateCount { get; set; }
    public int FailedCount { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
}

public interface ISyncEngineService
{
    event EventHandler<SyncExecutionSummary>? SyncCompleted;
    event EventHandler<string>? ConflictDetected;

    bool IsSyncing { get; }
    Task<SyncExecutionSummary> TriggerSyncAsync(string? overrideBaseUrl = null);
}
