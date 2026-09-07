using System;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.Input;
using OxenGL.Mobile.Models;
using OxenGL.Mobile.Services;

namespace OxenGL.Mobile.ViewModels;

public class FarmGateWeighmentViewModel : BaseViewModel
{
    private readonly IOfflineQueueService _queueService;

    private int _cropCycleId = 1;
    private string _fieldLocationName = "Al-Kharj Sector 4B";
    private double _grossWeight = 14500.0;
    private double _tareWeight = 4200.0;
    private double _netWeight = 10300.0;
    private string _notes = "Field harvested alfalfa batch - weighed at mobile platform scale.";
    private string _statusMessage = string.Empty;
    private bool _isSavedLocally;

    public int CropCycleId
    {
        get => _cropCycleId;
        set => SetProperty(ref _cropCycleId, value);
    }

    public string FieldLocationName
    {
        get => _fieldLocationName;
        set => SetProperty(ref _fieldLocationName, value);
    }

    public double GrossWeight
    {
        get => _grossWeight;
        set
        {
            if (SetProperty(ref _grossWeight, value))
            {
                RecalculateNetWeight();
            }
        }
    }

    public double TareWeight
    {
        get => _tareWeight;
        set
        {
            if (SetProperty(ref _tareWeight, value))
            {
                RecalculateNetWeight();
            }
        }
    }

    public double NetWeight
    {
        get => _netWeight;
        private set => SetProperty(ref _netWeight, value);
    }

    public string Notes
    {
        get => _notes;
        set => SetProperty(ref _notes, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public bool IsSavedLocally
    {
        get => _isSavedLocally;
        set => SetProperty(ref _isSavedLocally, value);
    }

    public bool CanApproveFinancially => false;

    public string FinancialApprovalWarning =>
        "⚠️ Direct inventory certification and ledger posting cannot be executed offline. Records are saved locally in DRAFT status and will synchronize once connectivity is restored.";

    public IAsyncRelayCommand QueueSubmissionCommand { get; }
    public IRelayCommand AttemptApprovalCommand { get; }

    public FarmGateWeighmentViewModel(IOfflineQueueService queueService)
    {
        _queueService = queueService;
        Title = "Farm-Gate Weighment Entry";

        QueueSubmissionCommand = new AsyncRelayCommand(QueueSubmissionAsync);
        AttemptApprovalCommand = new RelayCommand(TriggerApprovalAttemptWarning);

        RecalculateNetWeight();
    }

    private void RecalculateNetWeight()
    {
        NetWeight = Math.Max(0, GrossWeight - TareWeight);
    }

    private void TriggerApprovalAttemptWarning()
    {
        StatusMessage = "DENIED: Financial approval actions are locked offline. An online ERP ledger session is required.";
    }

    public async Task QueueSubmissionAsync()
    {
        if (GrossWeight <= TareWeight)
        {
            StatusMessage = "Gross weight must be greater than tare weight.";
            return;
        }

        IsBusy = true;
        try
        {
            var weighment = new LocalFarmGateWeighment
            {
                LocalId = Guid.NewGuid().ToString(),
                CropCycleId = CropCycleId,
                GrossWeight = GrossWeight,
                TareWeight = TareWeight,
                NetWeight = NetWeight,
                FieldLocationName = FieldLocationName,
                Notes = Notes,
                Status = "draft",
                CreatedAt = DateTime.UtcNow,
                IsSynced = false
            };

            var opId = await _queueService.QueueWeighmentSubmissionAsync(weighment);
            StatusMessage = $"✓ Weighment ({NetWeight:N0} kg net) saved to local queue! Op ID: {opId}";
            IsSavedLocally = true;
        }
        catch (Exception ex)
        {
            StatusMessage = $"Queue error: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }
}
