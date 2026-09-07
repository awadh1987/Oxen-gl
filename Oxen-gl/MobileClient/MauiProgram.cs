using System.Net.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Maui.Controls.Hosting;
using Microsoft.Maui.Hosting;
using OxenGL.Mobile.Services;
using OxenGL.Mobile.ViewModels;
using OxenGL.Mobile.Views;

namespace OxenGL.Mobile;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

#if DEBUG
        builder.Logging.AddDebug();
#endif

        // Core Infrastructure & Network
        builder.Services.AddSingleton<HttpClient>();
        builder.Services.AddSingleton<IApiClient, ApiClient>();

        // Storage & Offline Engine
        builder.Services.AddSingleton<ISecureStorageService, SecureStorageService>();
        builder.Services.AddSingleton<ILocalDatabaseService, LocalDatabaseService>();
        builder.Services.AddSingleton<IOfflineQueueService, OfflineQueueService>();
        builder.Services.AddSingleton<ISyncEngineService, SyncEngineService>();

        // Hardware Integrations
        builder.Services.AddSingleton<IGpsLocationService, GpsLocationService>();
        builder.Services.AddSingleton<ICameraCaptureService, CameraCaptureService>();

        // ViewModels
        builder.Services.AddSingleton<DashboardViewModel>();
        builder.Services.AddTransient<ProofOfDeliveryViewModel>();
        builder.Services.AddTransient<FarmGateWeighmentViewModel>();
        builder.Services.AddTransient<MaintenanceInspectionViewModel>();

        // Views & Shell
        builder.Services.AddSingleton<AppShell>();
        builder.Services.AddSingleton<DashboardPage>();
        builder.Services.AddTransient<ProofOfDeliveryPage>();
        builder.Services.AddTransient<FarmGateWeighmentPage>();
        builder.Services.AddTransient<MaintenanceInspectionPage>();

        return builder.Build();
    }
}
