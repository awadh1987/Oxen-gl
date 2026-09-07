using Microsoft.Maui.Controls;
using OxenGL.Mobile.ViewModels;

namespace OxenGL.Mobile.Views;

public partial class MaintenanceInspectionPage : ContentPage
{
    public MaintenanceInspectionPage(MaintenanceInspectionViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
