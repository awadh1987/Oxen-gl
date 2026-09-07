using Microsoft.Maui.Controls;
using OxenGL.Mobile.ViewModels;

namespace OxenGL.Mobile.Views;

public partial class ProofOfDeliveryPage : ContentPage
{
    public ProofOfDeliveryPage(ProofOfDeliveryViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
