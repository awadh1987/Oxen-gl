using System;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.Input;
using OxenGL.Mobile.Models;
using OxenGL.Mobile.Services;

namespace OxenGL.Mobile.ViewModels;

public class MaintenanceInspectionViewModel : BaseViewModel
{
    private readonly IOfflineQueueService _queueService;
    private readonly ICameraCaptureService _cameraService;

    private int _vehicleId = 1;
    private string _orderType = "inspection";
    private string _priority = "high";
    private string _description = "Pre-trip walkaround: right front tire low pressure and front bumper scrape detected on rugged desert terrain.";
    private double _odometerReading = 142580.0;
    
    private string? _encryptedPhotoPath;
    private string? _photoChecksum;
    private string _photoStatusMessage = "No inspection photo attached";

    private string _statusMessage = string.Empty;
    private bool _isQueued;

    public int VehicleId
    {
        get => _vehicleId;
        set => SetProperty(ref _vehicleId, value);
    }

    public string OrderType
    {
        get => _orderType;
        set => SetProperty(ref _orderType, value);
    }

    public string Priority
    {
        get => _priority;
        set => SetProperty(ref _priority, value);
    }

    public string Description
    {
        get => _description;
        set => SetProperty(ref _description, value);
    }

    public double OdometerReading
    {
        get => _odometerReading;
        set => SetProperty(ref _odometerReading, value);
    }

    public string? EncryptedPhotoPath
    {
        get => _encryptedPhotoPath;
        set => SetProperty(ref _encryptedPhotoPath, value);
    }

    public string? PhotoChecksum
    {
        get => _photoChecksum;
        set => SetProperty(ref _photoChecksum, value);
    }

    public string PhotoStatusMessage
    {
        get => _photoStatusMessage;
        set => SetProperty(ref _photoStatusMessage, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public bool IsQueued
    {
        get => _isQueued;
        set => SetProperty(ref _isQueued, value);
    }

    public IAsyncRelayCommand CaptureDamagePhotoCommand { get; }
    public IAsyncRelayCommand QueueWorkOrderCommand { get; }

    public MaintenanceInspectionViewModel(
        IOfflineQueueService queueService,
        ICameraCaptureService cameraService)
    {
        _queueService = queueService;
        _cameraService = cameraService;

        Title = "Maintenance & Vehicle Inspection";

        CaptureDamagePhotoCommand = new AsyncRelayCommand(CaptureDamagePhotoAsync);
        QueueWorkOrderCommand = new AsyncRelayCommand(QueueWorkOrderAsync);
    }

    public async Task CaptureDamagePhotoAsync()
    {
        IsBusy = true;
        try
        {
            PhotoStatusMessage = "Capturing and encrypting inspection photo (AES-256)...";
            var result = await _cameraService.CaptureAndEncryptPhotoAsync("inspection");

            EncryptedPhotoPath = result.EncryptedFilePath;
            PhotoChecksum = result.Sha256Checksum;
            PhotoStatusMessage = $"✓ Photo Encrypted ({result.FileSizeBytes} bytes, SHA-256: {result.Sha256Checksum.Substring(0, 12)}...)";
        }
        catch (Exception ex)
        {
            PhotoStatusMessage = $"Camera error: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task QueueWorkOrderAsync()
    {
        if (VehicleId <= 0)
        {
            StatusMessage = "A valid Vehicle ID is required.";
            return;
        }

        if (string.IsNullOrWhiteSpace(Description))
        {
            StatusMessage = "Inspection description cannot be blank.";
            return;
        }

        IsBusy = true;
        try
        {
            var workOrder = new LocalMaintenanceWorkOrder
            {
                LocalId = Guid.NewGuid().ToString(),
                VehicleId = VehicleId,
                OrderType = OrderType,
                Priority = Priority,
                Description = Description,
                OdometerReading = OdometerReading,
                Status = "draft",
                CreatedAt = DateTime.UtcNow,
                IsSynced = false
            };

            var opId = await _queueService.QueueMaintenanceWorkOrderAsync(workOrder);
            StatusMessage = $"✓ Work order for Vehicle #{VehicleId} queued offline! Op ID: {opId}";
            IsQueued = true;
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
