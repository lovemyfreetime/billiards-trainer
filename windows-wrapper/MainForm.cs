using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Drawing;

namespace BilliardsTrainer.Windows;

public sealed class MainForm : Form
{
    private const string AppUrl = "https://lovemyfreetime.github.io/billiards-trainer/";
    private readonly WebView2 webView = new();
    private FormBorderStyle savedBorderStyle;
    private FormWindowState savedWindowState;
    private Rectangle savedBounds;
    private bool isFullscreen;

    public MainForm()
    {
        Text = "Billiards Trainer AI Edition 4.12";
        BackColor = Color.FromArgb(9, 11, 14);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(1024, 640);
        KeyPreview = true;

        webView.Dock = DockStyle.Fill;
        webView.DefaultBackgroundColor = Color.FromArgb(9, 11, 14);
        Controls.Add(webView);

        Shown += async (_, _) => await InitializeWebViewAsync();
        KeyDown += MainForm_KeyDown;
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Billiards Trainer AI",
                "WebView2");

            Directory.CreateDirectory(userDataFolder);
            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await webView.EnsureCoreWebView2Async(env);

            var core = webView.CoreWebView2;
            core.Settings.AreDefaultContextMenusEnabled = true;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = true;
            core.Settings.IsZoomControlEnabled = true;

            core.NewWindowRequested += (_, e) =>
            {
                e.Handled = true;
                OpenExternal(e.Uri);
            };

            core.NavigationStarting += (_, e) =>
            {
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri)) return;
                if (uri.Host.Equals("lovemyfreetime.github.io", StringComparison.OrdinalIgnoreCase)) return;
                if (uri.Scheme is "about" or "data" or "blob") return;
                e.Cancel = true;
                OpenExternal(e.Uri);
            };

            core.PermissionRequested += (_, e) =>
            {
                if (e.PermissionKind == CoreWebView2PermissionKind.Camera ||
                    e.PermissionKind == CoreWebView2PermissionKind.Microphone)
                {
                    e.State = CoreWebView2PermissionState.Allow;
                }
            };

            core.ProcessFailed += (_, _) =>
            {
                BeginInvoke(async () =>
                {
                    try { core.Reload(); }
                    catch { await InitializeWebViewAsync(); }
                });
            };

            core.Navigate(AppUrl);
        }
        catch (Exception ex)
        {
            ShowStartupError(ex);
        }
    }

    private void ShowStartupError(Exception ex)
    {
        Controls.Clear();
        var label = new Label
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(9, 11, 14),
            ForeColor = Color.White,
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 14f),
            Padding = new Padding(40),
            Text = "Billiards Trainer could not start.\n\n" +
                   ex.Message +
                   "\n\nPlease make sure you are connected to the Internet, then reopen the app."
        };
        Controls.Add(label);
    }

    private static void OpenExternal(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return;
        try
        {
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch { }
    }

    private void MainForm_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.F11)
        {
            ToggleFullscreen();
            e.Handled = true;
            return;
        }

        if (e.KeyCode == Keys.Escape && isFullscreen)
        {
            ToggleFullscreen();
            e.Handled = true;
        }
    }

    private void ToggleFullscreen()
    {
        if (!isFullscreen)
        {
            savedBorderStyle = FormBorderStyle;
            savedWindowState = WindowState;
            savedBounds = Bounds;
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Normal;
            Bounds = Screen.FromControl(this).Bounds;
            isFullscreen = true;
        }
        else
        {
            FormBorderStyle = savedBorderStyle;
            WindowState = FormWindowState.Normal;
            Bounds = savedBounds;
            WindowState = savedWindowState;
            isFullscreen = false;
        }
    }
}
