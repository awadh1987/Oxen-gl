using Microsoft.Maui.Controls;
using OxenGL.Mobile.ViewModels;

namespace OxenGL.Mobile.Views;

public partial class FarmGateWeighmentPage : ContentPage
{
    public FarmGateWeighmentPage(FarmGateWeighmentViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
