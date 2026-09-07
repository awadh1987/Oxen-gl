using System;
using Microsoft.Maui.Controls;
using OxenGL.Mobile.ViewModels;

namespace OxenGL.Mobile.Views;

public partial class DashboardPage : ContentPage
{
    private readonly DashboardViewModel _viewModel;

    public DashboardPage(DashboardViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = _viewModel = viewModel;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await _viewModel.InitializeAsync();
    }

    private async void OnNavigatePodClicked(object? sender, EventArgs e)
    {
        await Shell.Current.GoToAsync("//pod");
    }

    private async void OnNavigateWeighmentClicked(object? sender, EventArgs e)
    {
        await Shell.Current.GoToAsync("//weighment");
    }

    private async void OnNavigateInspectionClicked(object? sender, EventArgs e)
    {
        await Shell.Current.GoToAsync("//inspection");
    }
}
