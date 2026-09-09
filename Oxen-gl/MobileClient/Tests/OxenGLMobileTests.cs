using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Xunit;
using OxenGL.Mobile.Models;
using OxenGL.Mobile.Services;
using OxenGL.Mobile.ViewModels;

namespace OxenGL.Mobile.Tests;

public class OxenGLMobileTests : IDisposable
{
    private readonly string _tempTestDir;
    private readonly ISecureStorageService _secureStorage;
    private readonly ILocalDatabaseService _databaseService;
    private readonly IOfflineQueueService _queueService;
    private readonly ICameraCaptureService _cameraService;
    private readonly IGpsLocationService _gpsService;

    public OxenGLMobileTests()
    {
        _tempTestDir = Path.Combine(Path.GetTempPath(), "OxenGL_Tests_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempTestDir);

        _secureStorage = new SecureStorageService(Path.Combine(_tempTestDir, "Secure"));
        _databaseService = new LocalDatabaseService(Path.Combine(_tempTestDir, "test_oxengl.db3"));
        _queueService = new OfflineQueueService(_databaseService);
        _cameraService = new CameraCaptureService(_secureStorage, Path.Combine(_tempTestDir, "Media"));
        _gpsService = new GpsLocationService();
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempTestDir))
            {
                Directory.Delete(_tempTestDir, true);
            }
        }
        catch { }
    }

    [Fact]
    public async Task Test_MinimumNecessaryData_CompliantStorage()
    {
        // Save auth context
        var context = new DeviceAuthContext
        {
            DeviceToken = "tok_sec_field_test_9981",
            DeviceId = "DEV-RUGGED-007",
            CompanyId = 1,
            DriverId = 42,
            IssuedAtUtc = DateTime.UtcNow
        };

        await _secureStorage.SaveAuthContextAsync(context);
        await _secureStorage.SetDeviceTokenAsync(context.DeviceToken);

        var retrievedToken = await _secureStorage.GetDeviceTokenAsync();
        var retrievedContext = await _secureStorage.GetAuthContextAsync();

        Assert.Equal("tok_sec_field_test_9981", retrievedToken);
        Assert.NotNull(retrievedContext);
        Assert.Equal("DEV-RUGGED-007", retrievedContext.DeviceId);
        Assert.Equal(1, retrievedContext.CompanyId);
        Assert.Equal(42, retrievedContext.DriverId);

        // Verify storage on disk is encrypted and does NOT leak raw token in plaintext
        var secureFiles = Directory.GetFiles(Path.Combine(_tempTestDir, "Secure"), "*.sec");
        Assert.NotEmpty(secureFiles);
        foreach (var file in secureFiles)
        {
            var rawBytes = await File.ReadAllBytesAsync(file);
            var rawText = Encoding.UTF8.GetString(rawBytes);
            Assert.DoesNotContain("tok_sec_field_test_9981", rawText);
        }
    }

    [Fact]
    public async Task Test_OfflineQueue_GeneratesUniqueOperationIds_Idempotency()
    {
        await _databaseService.InitializeAsync();

        var pod1 = new PodCapturePayload
        {
            TripId = "TRIP-2026-001",
            Latitude = 24.7136,
            Longitude = 46.6753,
            RecipientName = "Ahmed Warehouse Lead"
        };

        var pod2 = new PodCapturePayload
        {
            TripId = "TRIP-2026-002",
            Latitude = 24.7136,
            Longitude = 46.6753,
            RecipientName = "Salem Receiving"
        };

        var opId1 = await _queueService.QueuePodSubmissionAsync(pod1);
        var opId2 = await _queueService.QueuePodSubmissionAsync(pod2);

        Assert.NotEmpty(opId1);
        Assert.NotEmpty(opId2);
        Assert.NotEqual(opId1, opId2);

        // Verify GUID format
        Assert.True(Guid.TryParse(opId1, out _));
        Assert.True(Guid.TryParse(opId2, out _));

        var pending = await _queueService.GetPendingQueueAsync();
        Assert.Equal(2, pending.Count);
    }

    [Fact]
    public async Task Test_FarmGateWeighment_StrictNetWeightAndApprovalLockdown()
    {
        await _databaseService.InitializeAsync();

        // 1. Valid weighment (net = gross - tare)
        var validWeighment = new LocalFarmGateWeighment
        {
            CropCycleId = 1,
            GrossWeight = 15000,
            TareWeight = 5000,
            NetWeight = 10000,
            FieldLocationName = "Wadi Al-Dawasir Gate 3",
            Status = "draft"
        };
        var opId = await _queueService.QueueWeighmentSubmissionAsync(validWeighment);
        Assert.NotEmpty(opId);

        // 2. Discrepant weighment fails
        var invalidWeight = new LocalFarmGateWeighment
        {
            CropCycleId = 1,
            GrossWeight = 15000,
            TareWeight = 5000,
            NetWeight = 9000 // Discrepancy!
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _queueService.QueueWeighmentSubmissionAsync(invalidWeight));

        // 3. Offline financial approval is strictly blocked
        var attemptApproved = new LocalFarmGateWeighment
        {
            CropCycleId = 1,
            GrossWeight = 15000,
            TareWeight = 5000,
            NetWeight = 10000,
            Status = "approved" // Forbidden offline!
        };
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _queueService.QueueWeighmentSubmissionAsync(attemptApproved));
        Assert.Contains("Financial and inventory balance approvals cannot be executed offline", ex.Message);
    }

    [Fact]
    public async Task Test_CameraMedia_EncryptedAtRest_CannotOpenAsPlaintextImage()
    {
        // Known raw JPEG header bytes (SOI marker \xFF\xD8\xFF\xE0)
        byte[] rawImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01 };

        var result = await _cameraService.CaptureAndEncryptPhotoAsync("pod", rawImageBytes);

        Assert.NotNull(result);
        Assert.True(File.Exists(result.EncryptedFilePath));

        // Read physical file on disk
        byte[] diskBytes = await File.ReadAllBytesAsync(result.EncryptedFilePath);

        // Verify disk bytes do NOT start with JPEG magic bytes (0xFF 0xD8 0xFF)
        bool hasJpegMagicBytes = diskBytes.Length >= 3 && diskBytes[0] == 0xFF && diskBytes[1] == 0xD8 && diskBytes[2] == 0xFF;
        Assert.False(hasJpegMagicBytes, "Security Failure: Encrypted file on disk must NOT have plaintext JPEG headers!");

        // Verify SHA-256 checksum matches
        using var sha = SHA256.Create();
        var calculatedHash = Convert.ToHexString(sha.ComputeHash(diskBytes));
        Assert.Equal(result.Sha256Checksum, calculatedHash);

        // Verify authorized decryption restores original bytes exactly
        byte[] decryptedBytes = await _cameraService.DecryptMediaAsync(result.EncryptedFilePath, result.IvBase64);
        Assert.Equal(rawImageBytes, decryptedBytes);
    }

    [Fact]
    public async Task Test_GpsLocation_EnforcesExplicitConsent()
    {
        var result = await _gpsService.CaptureCurrentLocationAsync();
        Assert.NotNull(result);
        Assert.True(result.HasPermission);
        Assert.True(result.Latitude > 0);
        Assert.True(result.Longitude > 0);
    }

    [Fact]
    public void Test_DashboardViewModel_StrictOfflineFinancialApprovalLockdown()
    {
        var mockDb = new LocalDatabaseService(Path.Combine(_tempTestDir, "mock_db.db3"));
        var vm = new DashboardViewModel(mockDb, _secureStorage, new SyncEngineService(mockDb, _secureStorage, new ApiClient()), new ApiClient());

        Assert.False(vm.IsFinancialApprovalAllowed);
        Assert.Contains("Financial approvals and ledger posting cannot be executed offline", vm.FinancialApprovalWarning);
    }
}
