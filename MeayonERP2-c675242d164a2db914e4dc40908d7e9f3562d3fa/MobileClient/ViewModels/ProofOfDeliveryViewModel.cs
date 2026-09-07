using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.Input;
using OxenGL.Mobile.Models;
using OxenGL.Mobile.Services;

namespace OxenGL.Mobile.ViewModels;

public class ProofOfDeliveryViewModel : BaseViewModel
{
    private readonly IOfflineQueueService _queueService;
    private readonly IGpsLocationService _gpsService;
    private readonly ICameraCaptureService _cameraService;

    private string _tripId = "TRIP-2026-0042";
    private string _recipientName = string.Empty;
    private string _notes = string.Empty;

    private double? _latitude;
    private double? _longitude;
    private double? _accuracyMeters;
    private string _gpsStatusMessage = "GPS not acquired (Tap to capture with consent)";

    private string? _encryptedPhotoPath;
    private string? _photoChecksum;
    private string _cameraStatusMessage = "No photo captured";

    private string _statusMessage = string.Empty;
    private bool _isSubmissionComplete;

    public string TripId
    {
        get => _tripId;
        set => SetProperty(ref _tripId, value);
    }

    public string RecipientName
    {
        get => _recipientName;
        set => SetProperty(ref _recipientName, value);
    }

    public string Notes
    {
        get => _notes;
        set => SetProperty(ref _notes, value);
    }

    public double? Latitude
    {
        get => _latitude;
        set => SetProperty(ref _latitude, value);
    }

    public double? Longitude
    {
        get => _longitude;
        set => SetProperty(ref _longitude, value);
    }

    public double? AccuracyMeters
    {
        get => _accuracyMeters;
        set => SetProperty(ref _accuracyMeters, value);
    }

    public string GpsStatusMessage
    {
        get => _gpsStatusMessage;
        set => SetProperty(ref _gpsStatusMessage, value);
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

    public string CameraStatusMessage
    {
        get => _cameraStatusMessage;
        set => SetProperty(ref _cameraStatusMessage, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public bool IsSubmissionComplete
    {
        get => _isSubmissionComplete;
        set => SetProperty(ref _isSubmissionComplete, value);
    }

    public IAsyncRelayCommand CaptureGpsCommand { get; }
    public IAsyncRelayCommand CapturePhotoCommand { get; }
    public IAsyncRelayCommand SubmitPodCommand { get; }

    public ProofOfDeliveryViewModel(
        IOfflineQueueService queueService,
        IGpsLocationService gpsService,
        ICameraCaptureService cameraService)
    {
        _queueService = queueService;
        _gpsService = gpsService;
        _cameraService = cameraService;

        Title = "Proof of Delivery (POD)";

        CaptureGpsCommand = new AsyncRelayCommand(CaptureGpsAsync);
        CapturePhotoCommand = new AsyncRelayCommand(CapturePhotoAsync);
        SubmitPodCommand = new AsyncRelayCommand(SubmitPodAsync);
    }

    public async Task CaptureGpsAsync()
    {
        IsBusy = true;
        try
        {
            GpsStatusMessage = "Requesting location with driver consent...";
            var result = await _gpsService.CaptureCurrentLocationAsync();

            if (!result.HasPermission || !string.IsNullOrEmpty(result.ErrorMessage))
            {
                GpsStatusMessage = $"⚠️ {result.ErrorMessage}";
                return;
            }

            Latitude = result.Latitude;
            Longitude = result.Longitude;
            AccuracyMeters = result.AccuracyMeters;
            GpsStatusMessage = $"✓ Acquired: {result.Latitude:F4}, {result.Longitude:F4} (±{result.AccuracyMeters:F1}m)";
        }
        catch (Exception ex)
        {
            GpsStatusMessage = $"Error: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task CapturePhotoAsync()
    {
        IsBusy = true;
        try
        {
            CameraStatusMessage = "Capturing and encrypting photo at rest (AES-256)...";
            var result = await _cameraService.CaptureAndEncryptPhotoAsync("pod");

            EncryptedPhotoPath = result.EncryptedFilePath;
            PhotoChecksum = result.Sha256Checksum;
            CameraStatusMessage = $"✓ Encrypted ({result.FileSizeBytes} bytes, SHA-256: {result.Sha256Checksum.Substring(0, 12)}...)";
        }
        catch (Exception ex)
        {
            CameraStatusMessage = $"Camera error: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task SubmitPodAsync()
    {
        if (string.IsNullOrWhiteSpace(TripId))
        {
            StatusMessage = "Trip ID cannot be empty.";
            return;
        }

        if (string.IsNullOrWhiteSpace(RecipientName))
        {
            StatusMessage = "Recipient signature/name is required.";
            return;
        }

        if (!Latitude.HasValue || !Longitude.HasValue)
        {
            StatusMessage = "GPS Geolocation is required for Proof of Delivery. Please capture GPS.";
            return;
        }

        IsBusy = true;
        try
        {
            var payload = new PodCapturePayload
            {
                TripId = TripId,
                Latitude = Latitude.Value,
                Longitude = Longitude.Value,
                GpsAccuracy = AccuracyMeters,
                CapturedAt = DateTime.UtcNow,
                RecipientName = RecipientName,
                Notes = Notes,
                EncryptedPhotoPath = EncryptedPhotoPath,
                PhotoChecksum = PhotoChecksum
            };

            var opId = await _queueService.QueuePodSubmissionAsync(payload);
            StatusMessage = $"✓ POD command successfully queued offline! Op ID: {opId}";
            IsSubmissionComplete = true;
        }
        catch (Exception ex)
        {
            StatusMessage = $"Submission error: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }
}
