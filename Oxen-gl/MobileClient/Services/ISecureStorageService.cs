using System.Threading.Tasks;
using OxenGL.Mobile.Models;

namespace OxenGL.Mobile.Services;

public interface ISecureStorageService
{
    Task<string?> GetDeviceTokenAsync();
    Task SetDeviceTokenAsync(string token);
    Task<DeviceAuthContext?> GetAuthContextAsync();
    Task SaveAuthContextAsync(DeviceAuthContext context);
    Task<string> GetOrCreateEncryptionKeyAsync();
    Task ClearAllAsync();
}
