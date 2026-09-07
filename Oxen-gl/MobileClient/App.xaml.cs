using Microsoft.Maui.Controls;

namespace OxenGL.Mobile;

public partial class App : Application
{
    public App(AppShell shell)
    {
        InitializeComponent();
        MainPage = shell;
    }
}
