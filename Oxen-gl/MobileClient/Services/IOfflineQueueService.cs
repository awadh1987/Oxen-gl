using System.Collections.Generic;
using System.Threading.Tasks;
using OxenGL.Mobile.Models;

namespace OxenGL.Mobile.Services;

public interface IOfflineQueueService
{
    Task<string> QueuePodSubmissionAsync(PodCapturePayload pod);
    Task<string> QueueWeighmentSubmissionAsync(LocalFarmGateWeighment weighment);
    Task<string> QueueMaintenanceWorkOrderAsync(LocalMaintenanceWorkOrder workOrder);
    Task<List<QueuedOperation>> GetPendingQueueAsync();
    Task<List<QueuedOperation>> GetConflictAlertsAsync();
    Task<int> GetPendingCountAsync();
}
