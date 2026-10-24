using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Drawing;
using System.Text.Json;

namespace BilliardsTrainer.Windows;

public sealed class MainForm : Form
{
    private const string AppUrl = "https://lovemyfreetime.github.io/billiards-trainer/";
    private readonly WebView2 webView = new();
    private FormBorderStyle savedBorderStyle;
    private FormWindowState savedWindowState;
    private Rectangle savedBounds;
    private bool isFullscreen;
    private readonly bool startLocal;
    private readonly bool offlineSmoke;
    private int externalSmokeRequests;
    private Process? localHost;
    private Uri? localHostUri;
    private bool startingLocal;

    public MainForm(bool hostLocal = false, bool smoke = false)
    {
        startLocal = hostLocal;
        offlineSmoke = smoke;
        Text = "Billiards Trainer AI Edition 4.12";
        BackColor = Color.FromArgb(9, 11, 14);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(1024, 640);
        KeyPreview = true;

        webView.Dock = DockStyle.Fill;
        webView.DefaultBackgroundColor = Color.FromArgb(9, 11, 14);
        Controls.Add(webView);

        Shown += async (_, _) => { ToggleFullscreen(); await InitializeWebViewAsync(); };
        KeyDown += MainForm_KeyDown;
        FormClosed += (_, _) => StopLocalHost();
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Billiards Trainer AI",
                "WebView2");

            if (offlineSmoke) userDataFolder = Path.Combine(Path.GetTempPath(), "Billiards-offline-smoke-" + Guid.NewGuid());
            Directory.CreateDirectory(userDataFolder);
            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder, offlineSmoke ? new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required --disable-background-networking") : null);
            await webView.EnsureCoreWebView2Async(env);

            var core = webView.CoreWebView2;
            var bundlePath = Path.Combine(AppContext.BaseDirectory, "offline-app");
            if (!File.Exists(Path.Combine(bundlePath, "welcome.html")))
                throw new InvalidOperationException("The complete offline app is missing. Reinstall the current Windows installer.");
            // Retain this profile's LocalStorage and IndexedDB (games, tables and saved layouts).
            // Remove the old web-only worker/cache so it cannot intercept the installed bundle.
            await core.Profile.ClearBrowsingDataAsync(CoreWebView2BrowsingDataKinds.ServiceWorkers |
                CoreWebView2BrowsingDataKinds.CacheStorage | CoreWebView2BrowsingDataKinds.DiskCache);
            ContentUpdates? updates = null;
            try { updates = new ContentUpdates(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Billiards Trainer AI", "ContentUpdates"), bundlePath); }
            catch { /* A read-only/full update cache never prevents packaged startup. */ }
            var bundle = new BundledAssets(bundlePath, updates);
            void NotifyUpdate(ContentUpdates.UpdateState state)
            {
                if (IsDisposed || !IsHandleCreated) return;
                BeginInvoke(async () => { try { await core.ExecuteScriptAsync("window.dispatchEvent(new CustomEvent('billiards:content-update',{detail:" + JsonSerializer.Serialize(state, ContentUpdates.Json) + "}))"); } catch { } });
            }
            core.AddWebResourceRequestedFilter("https://lovemyfreetime.github.io/*", CoreWebView2WebResourceContext.All,
                CoreWebView2WebResourceRequestSourceKinds.All);
            core.WebResourceRequested += (_, request) =>
            {
                if (!Uri.TryCreate(request.Request.Uri, UriKind.Absolute, out var uri) || uri.Scheme != "https" || uri.Host != "lovemyfreetime.github.io") return;
                var range = request.Request.Headers.Contains("Range") ? request.Request.Headers.GetHeader("Range") : null;
                var reply = bundle.Read(uri, request.Request.Method, range);
                request.Response = env.CreateWebResourceResponse(reply.Body, reply.Status, reply.Reason, reply.Headers);
            };
            if (offlineSmoke)
            {
                core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All, CoreWebView2WebResourceRequestSourceKinds.All);
                core.WebResourceRequested += (_, request) =>
                {
                    if (request.Request.Uri.StartsWith("https://lovemyfreetime.github.io/", StringComparison.Ordinal)) return;
                    if (!request.Request.Uri.StartsWith("http", StringComparison.Ordinal)) return;
                    externalSmokeRequests++;
                    request.Response = env.CreateWebResourceResponse(null, 503, "Internet unavailable", "Content-Length: 0\r\n");
                };
            }
            core.Settings.AreDefaultContextMenusEnabled = true;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = true;
            core.Settings.IsZoomControlEnabled = true;

            await core.AddScriptToExecuteOnDocumentCreatedAsync("if(location.origin==='https://lovemyfreetime.github.io'){window.BilliardsBundledWindows=true;window.BilliardsContentUpdateProtocol=" + (updates == null ? 0 : ContentUpdates.Protocol) + ";window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;}");
            core.NavigationCompleted += async (_, _) =>
            {
                await core.ExecuteScriptAsync("window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=" +
                    (isFullscreen ? "true" : "false") + ";window.dispatchEvent(new CustomEvent('billiards:native-fullscreen',{detail:window.BilliardsWindowsFullscreen}));");
            };
            core.WebMessageReceived += async (_, e) =>
            {
                if (!Uri.TryCreate(e.Source, UriKind.Absolute, out var source)) return;
                var publicApp = source.Scheme == "https" && source.Host == "lovemyfreetime.github.io" &&
                    source.AbsolutePath.StartsWith("/billiards-trainer/", StringComparison.Ordinal);
                var localApp = localHostUri != null && source.Scheme == "http" && source.Host == "127.0.0.1" && source.Port == localHostUri.Port;
                if (!publicApp && !localApp) return;
                try
                {
                    using var message = JsonDocument.Parse(e.WebMessageAsJson);
                    if (message.RootElement.TryGetProperty("type", out var type))
                    {
                        if (publicApp && updates != null && type.GetString() == "content-update-status") NotifyUpdate(updates.Status);
                        else if (publicApp && updates != null && type.GetString() == "content-update-check")
                        {
                            bool force = message.RootElement.TryGetProperty("force", out var forced) && forced.ValueKind == JsonValueKind.True;
                            _ = Task.Run(() => updates.Check(force, NotifyUpdate));
                        }
                        else if (publicApp && updates != null && type.GetString() == "content-update-apply" && updates.Status.State == "ready")
                        { updates.Apply(); core.Reload(); }
                        else if (publicApp && type.GetString() == "start-local-play") await StartLocalHostAsync();
                        else if (type.GetString() == "close-app") Close();
                        else if (type.GetString() == "set-fullscreen" &&
                                 message.RootElement.TryGetProperty("active", out var active) &&
                                 active.ValueKind is JsonValueKind.True or JsonValueKind.False)
                        {
                            if (isFullscreen != active.GetBoolean()) ToggleFullscreen();
                        }
                    }
                }
                catch (Exception ex) { MessageBox.Show(this, ex.Message, "Local Play"); }
            };

            core.NewWindowRequested += (_, e) =>
            {
                e.Handled = true;
                OpenExternal(e.Uri);
            };

            core.NavigationStarting += (_, e) =>
            {
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri)) return;
                if (uri.Host.Equals("lovemyfreetime.github.io", StringComparison.OrdinalIgnoreCase)) return;
                if (localHostUri != null && uri.Scheme == "http" && uri.Host == "127.0.0.1" && uri.Port == localHostUri.Port) return;
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

            if (offlineSmoke)
            {
                try { await OfflineSmoke.Run(core); if (externalSmokeRequests != 0) throw new Exception($"App attempted {externalSmokeRequests} internet requests"); Console.WriteLine("OFFLINE WebView2 smoke passed: zero public network requests"); Environment.ExitCode = 0; }
                catch (Exception ex) { Console.Error.WriteLine(ex); Environment.ExitCode = 1; }
                Close(); return;
            }
            if (startLocal) await StartLocalHostAsync();
            else core.Navigate(AppUrl);
        }
        catch (Exception ex)
        {
            if (offlineSmoke) { Console.Error.WriteLine(ex); Environment.ExitCode = 1; Close(); } else ShowStartupError(ex);
        }
    }

    private async Task StartLocalHostAsync()
    {
        if (startingLocal) return;
        if (localHost is { HasExited: false } && localHostUri != null)
        {
            webView.CoreWebView2.Navigate(localHostUri.AbsoluteUri);
            return;
        }
        startingLocal = true;
        try
        {
            var folder = Path.Combine(AppContext.BaseDirectory, "local-play");
            var node = Path.Combine(folder, "node.exe");
            if (!File.Exists(node)) throw new InvalidOperationException("Install the current Windows installer to enable local hosting.");
            var info = new ProcessStartInfo(node)
            {
                WorkingDirectory = folder, UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardOutput = true, RedirectStandardError = true
            };
            info.ArgumentList.Add(Path.Combine(folder, "local-host", "server.cjs"));
            info.ArgumentList.Add("--machine");
            localHost = Process.Start(info) ?? throw new InvalidOperationException("The local host could not start.");
            var line = await localHost.StandardOutput.ReadLineAsync().WaitAsync(TimeSpan.FromSeconds(15));
            if (line == null) throw new InvalidOperationException(await localHost.StandardError.ReadToEndAsync());
            using var ready = JsonDocument.Parse(line);
            var url = ready.RootElement.GetProperty("hostUrl").GetString();
            if (!Uri.TryCreate(url, UriKind.Absolute, out var host) || host.Scheme != "http" || host.Host != "127.0.0.1")
                throw new InvalidOperationException("The local host returned an invalid address.");
            localHostUri = host;
            webView.CoreWebView2.Navigate(host.AbsoluteUri);
        }
        catch { StopLocalHost(); throw; }
        finally { startingLocal = false; }
    }

    private void StopLocalHost()
    {
        try { if (localHost is { HasExited: false }) localHost.Kill(entireProcessTree: true); }
        catch { /* The host may already have stopped. */ }
        localHost?.Dispose(); localHost = null; localHostUri = null;
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
                   (startLocal ? "\n\nClose other local hosts, connect to your private Wi-Fi, and reopen Local Play." : "\n\nReinstall the current complete Windows app, then reopen it. Installed app content does not need internet.")
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
        if (webView.CoreWebView2 != null)
            _ = webView.CoreWebView2.ExecuteScriptAsync(
                "window.dispatchEvent(new CustomEvent('billiards:native-fullscreen',{detail:" +
                (isFullscreen ? "true" : "false") + "}));");
    }
}
