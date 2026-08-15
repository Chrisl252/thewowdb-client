using TheWoWDB.Client.Core;
using TheWoWDB.Client.Startup;
using TheWoWDB.Client.Sync;

namespace TheWoWDB.Client.Ui;

/// <summary>
/// The client's actual lifetime: a tray icon and a timer. The window is just a
/// view onto this. Owns nothing but presentation and scheduling; the work
/// itself belongs to SyncService.
/// </summary>
public sealed class TrayApp : ApplicationContext
{
    private readonly Settings _settings;
    private readonly SyncService _sync;
    private readonly NotifyIcon _tray;
    private readonly System.Windows.Forms.Timer _timer;
    private readonly Icon _icon;
    private MainForm? _window;
    private bool _running;

    public TrayApp(Settings settings, Icon icon, bool startHidden)
    {
        _settings = settings;
        _icon = icon;
        _sync = new SyncService(settings,
            string.IsNullOrWhiteSpace(settings.ManifestUrl)
                ? Downloader.DefaultManifestUrl
                : settings.ManifestUrl!);

        _tray = new NotifyIcon
        {
            Icon = icon,
            Text = AppInfo.Name,
            Visible = true,
            ContextMenuStrip = BuildMenu(),
        };
        _tray.DoubleClick += (_, _) => ShowWindow();

        _timer = new System.Windows.Forms.Timer
        {
            Interval = (int)TimeSpan.FromHours(Math.Clamp(settings.CheckIntervalHours, 1, 24)).TotalMilliseconds,
        };
        _timer.Tick += async (_, _) => await SyncAsync(announce: true);
        _timer.Start();

        if (!startHidden) ShowWindow();

        // Give Windows a moment to finish logging in before hitting the network.
        var kick = new System.Windows.Forms.Timer { Interval = startHidden ? 30_000 : 1_500 };
        kick.Tick += async (_, _) =>
        {
            kick.Stop();
            kick.Dispose();
            await SyncAsync(announce: startHidden);
        };
        kick.Start();
    }

    private ContextMenuStrip BuildMenu()
    {
        var menu = new ContextMenuStrip { ShowImageMargin = false };

        var open = new ToolStripMenuItem("Open TheWoWDB Client", null, (_, _) => ShowWindow())
        {
            Font = new Font(menu.Font, FontStyle.Bold),
        };
        var check = new ToolStripMenuItem("Check for updates now", null,
            async (_, _) => await SyncAsync(announce: true));

        var startup = new ToolStripMenuItem("Start with Windows") { CheckOnClick = true, Checked = AutoStart.IsEnabled() };
        startup.CheckedChanged += (_, _) =>
        {
            _settings.RunAtStartup = startup.Checked;
            AutoStart.Set(startup.Checked);
            _settings.Save();
        };

        menu.Items.Add(open);
        menu.Items.Add(check);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(startup);
        menu.Items.Add(new ToolStripMenuItem("thewowdb.com", null, (_, _) => Theme.OpenUrl(AppInfo.Site)));
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(new ToolStripMenuItem("Quit", null, (_, _) => Quit()));
        return menu;
    }

    private void ShowWindow()
    {
        if (_window is null || _window.IsDisposed)
        {
            _window = new MainForm(_settings, ct => _sync.RunAsync(ct), _icon);
        }
        _window.Show();
        _window.WindowState = FormWindowState.Normal;
        _window.Activate();
    }

    private async Task SyncAsync(bool announce)
    {
        if (_running) return;
        _running = true;
        try
        {
            // When the window is open let IT drive, so the user sees per-client rows.
            if (_window is { Visible: true, IsDisposed: false })
            {
                await _window.RunSyncAsync();
                return;
            }

            var report = await _sync.RunAsync();
            if (!_settings.FirstRunDone && report.AnyChange)
            {
                _settings.FirstRunDone = true;
                _settings.Save();
                Notify("TheWoWDB Companion is installed",
                       "Restart World of Warcraft to load it. This client keeps it updated from the tray.");
            }
            else if (announce && report.AnyChange)
            {
                Notify(AppInfo.Name, report.Summary);
            }
        }
        catch (Exception ex)
        {
            Log.Error("scheduled sync failed", ex);
        }
        finally
        {
            _running = false;
        }
    }

    private void Notify(string title, string text)
    {
        _tray.BalloonTipTitle = title;
        _tray.BalloonTipText = text;
        _tray.BalloonTipIcon = ToolTipIcon.None;
        _tray.ShowBalloonTip(8000);
    }

    private void Quit()
    {
        _timer.Stop();
        _tray.Visible = false;
        _tray.Dispose();
        _window?.ExitForReal();
        ExitThread();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _timer.Dispose();
            _tray.Dispose();
        }
        base.Dispose(disposing);
    }
}
