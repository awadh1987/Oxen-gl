using System;
using System.Threading.Tasks;

namespace OxenGL.Mobile.Services;

public class EncryptedMediaResult
{
    public string OriginalFileName { get; set; } = string.Empty;
    public string EncryptedFilePath { get; set; } = string.Empty;
    public string Category { get; set; } = "pod";
    public long FileSizeBytes { get; set; }
    public string Sha256Checksum { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string IvBase64 { get; set; } = string.Empty;
}

public interface ICameraCaptureService
{
    Task<EncryptedMediaResult> CaptureAndEncryptPhotoAsync(string category, byte[]? rawPhotoBytes = null);
    Task<byte[]> DecryptMediaAsync(string encryptedFilePath, string? ivBase64 = null);
}
