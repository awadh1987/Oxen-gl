using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.Input;
using OxenGL.Mobile.Models;
using OxenGL.Mobile.Services;

namespace OxenGL.Mobile.ViewModels;

public partial class DashboardViewModel : BaseViewModel
{
    private readonly ILocalDatabaseService _db;
    private readonly ISecureStorageService _secureStorage;
    private readonly ISyncEngineService _syncEngine;
    private readonly IApiClient _apiClient;

    private bool _isOnline;
    private string _connectionStatusText = "Checking connection...";
    private int _pendingCount;
    private int _conflictCount;
    private string _lastSyncMessage = "Ready to sync";
    private string _deviceId = string.Empty;
    private int _companyId;
    private int? _driverId;

    public ObservableCollection<QueuedOperation> ConflictAlerts { get; } = new();

    public bool IsOnline
    {
        get => _isOnline;
        set
        {
            if (SetProperty(ref _isOnline, value))
            {
                ConnectionStatusText = value 
                    ? "ONLINE - Connected to ERP Core" 
                    : "OFFLINE - Queued Locally (Zero-Trust Mode)";
            }
        }
    }

    public string ConnectionStatusText
    {
        get => _connectionStatusText;
        set => SetProperty(ref _connectionStatusText, value);
    }

    public int PendingCount
    {
        get => _pendingCount;
        set => SetProperty(ref _pendingCount, value);
    }

    public int ConflictCount
    {
        get => _conflictCount;
        set => SetProperty(ref _conflictCount, value);
    }

    public string LastSyncMessage
    {
        get => _lastSyncMessage;
        set => SetProperty(ref _lastSyncMessage, value);
    }

    public string DeviceId
    {
        get => _deviceId;
        set => SetProperty(ref _deviceId, value);
    }

    public int CompanyId
    {
        get => _companyId;
        set => SetProperty(ref _companyId, value);
    }

    public int? DriverId
    {
        get => _driverId;
        set => SetProperty(ref _driverId, value);
    }

    public bool IsFinancialApprovalAllowed => false;

    public string FinancialApprovalWarning => 
        "Financial approvals and ledger posting cannot be executed offline. An active ERP server connection is strictly required.";

    public IAsyncRelayCommand RefreshStatusCommand { get; }
    public IAsyncRelayCommand SyncNowCommand { get; }

    public DashboardViewModel(
        ILocalDatabaseService db,
        ISecureStorageService secureStorage,
        ISyncEngineService syncEngine,
        IApiClient apiClient)
    {
        _db = db;
        _secureStorage = secureStorage;
        _syncEngine = syncEngine;
        _apiClient = apiClient;

        Title = "OxenGL Field Operations";

        RefreshStatusCommand = new AsyncRelayCommand(RefreshStatusAsync);
        SyncNowCommand = new AsyncRelayCommand(ExecuteSyncAsync);

        _syncEngine.ConflictDetected += (s, msg) =>
        {
            LastSyncMessage = $"⚠️ {msg}";
            _ = RefreshStatusAsync();
        };

        _syncEngine.SyncCompleted += (s, summary) =>
        {
            LastSyncMessage = summary.Message;
            _ = RefreshStatusAsync();
        };
    }

    public async Task InitializeAsync()
    {
        var auth = await _secureStorage.GetAuthContextAsync();
        if (auth != null)
        {
            DeviceId = auth.DeviceId;
            CompanyId = auth.CompanyId;
            DriverId = auth.DriverId;
        }

        await RefreshStatusAsync();
    }

    public async Task RefreshStatusAsync()
    {
        IsBusy = true;
        try
        {
            // Check connectivity
            IsOnline = await _apiClient.CheckConnectionAsync("http://127.0.0.1:8000");

            // Load counts
            PendingCount = await _db.GetPendingCountAsync();
            ConflictCount = await _db.GetConflictCountAsync();

            // Load conflict alerts
            var conflicts = await _db.GetConflictOperationsAsync();
            ConflictAlerts.Clear();
            foreach (var c in conflicts)
            {
                ConflictAlerts.Add(c);
            }
        }
        catch (Exception ex)
        {
            LastSyncMessage = $"Status check error: {ex.Message}";
            IsOnline = false;
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task ExecuteSyncAsync()
    {
        if (IsBusy) return;

        IsBusy = true;
        try
        {
            LastSyncMessage = "Starting sync with ERP server...";
            var result = await _syncEngine.TriggerSyncAsync();
            LastSyncMessage = result.Message;
            await RefreshStatusAsync();
        }
        finally
        {
            IsBusy = false;
        }
    }
}
