using TheWoWDB.Client.Core;
using TheWoWDB.Client.Startup;
using TheWoWDB.Client.Sync;
using TheWoWDB.Client.Wow;

namespace TheWoWDB.Client.Ui;

/// <summary>
/// The whole visible client: what it found, what it did, and the three switches
/// that change its behaviour. Closing it hides to the tray rather than exiting,
/// which is the only way a background updater is any use.
/// </summary>
public sealed class MainForm : Form
{
    private readonly Settings _settings;
    private readonly Func<CancellationToken, Task<SyncReport>> _sync;

    private readonly FlowLayoutPanel _list;
    private readonly Label _status;
    private readonly Button _check;
    private readonly List<FlavorRow> _rows = new();
    private bool _busy;

    public bool ReallyExit { get; private set; }

    private readonly Icon _icon;

    public MainForm(Settings settings, Func<CancellationToken, Task<SyncReport>> sync, Icon icon)
    {
        _settings = settings;
        _sync = sync;
        _icon = icon;

        Text = AppInfo.Name;
        Icon = icon;
        // Tall enough for six flavors (retail + the classic family + PTR/beta)
        // without scrolling; a scrollbar on first run reads as "something is cut off".
        ClientSize = new Size(580, 640);
        MinimumSize = new Size(580, 460);
        StartPosition = FormStartPosition.CenterScreen;
        DarkTitleBar.Apply(this);
        BackColor = Theme.Bg;
        ForeColor = Theme.Text;
        Font = Theme.Ui();

        var header = BuildHeader();
        _status = new Label
        {
            Dock = DockStyle.Top,
            Height = 34,
            Padding = new Padding(20, 8, 20, 0),
            Font = Theme.Ui(9f),
            ForeColor = Theme.Muted,
            Text = "Looking for World of Warcraft...",
        };

        _list = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoScroll = true,
            Padding = new Padding(20, 4, 20, 8),
            BackColor = Theme.Bg,
        };

        Controls.Add(_list);
        Controls.Add(_status);
        Controls.Add(header);
        Controls.Add(BuildFooter());

        _check = Theme.MakeButton("Check now", primary: true);
        _check.Width = 110;
        _check.Click += async (_, _) => await RunSyncAsync();

        var addFolder = Theme.MakeButton("Add WoW folder...");
        addFolder.Width = 130;
        addFolder.Click += (_, _) => AddFolder();

        var buttons = new FlowLayoutPanel
        {
            Dock = DockStyle.Bottom,
            Height = 46,
            Padding = new Padding(20, 8, 20, 8),
            BackColor = Theme.Bg,
            FlowDirection = FlowDirection.LeftToRight,
        };
        buttons.Controls.Add(_check);
        buttons.Controls.Add(addFolder);
        Controls.Add(buttons);
        Controls.SetChildIndex(buttons, 1);

        LoadFlavors();
    }

    private Control BuildHeader()
    {
        var header = new Panel { Dock = DockStyle.Top, Height = 74, BackColor = Theme.Bg };

        var logo = new PictureBox
        {
            Image = _icon.ToBitmap(),
            SizeMode = PictureBoxSizeMode.Zoom,
            Size = new Size(44, 44),
            Location = new Point(20, 16),
            BackColor = Color.Transparent,
        };

        var title = new Label
        {
            Text = "TheWoWDB Client",
            Location = new Point(76, 18),
            AutoSize = true,
            Font = Theme.Ui(13f, FontStyle.Bold),
            ForeColor = Theme.Gold,
            BackColor = Color.Transparent,
        };

        var sub = new Label
        {
            Text = $"Keeps the Companion addon and its prices current  ·  v{AppInfo.Version}",
            Location = new Point(78, 43),
            AutoSize = true,
            Font = Theme.Ui(8.5f),
            ForeColor = Theme.Muted,
            BackColor = Color.Transparent,
        };

        header.Controls.AddRange([logo, title, sub]);
        header.Paint += (_, e) =>
        {
            using var pen = new Pen(Theme.Border);
            e.Graphics.DrawLine(pen, 0, header.Height - 1, header.Width, header.Height - 1);
        };
        return header;
    }

    private Control BuildFooter()
    {
        var footer = new Panel { Dock = DockStyle.Bottom, Height = 92, BackColor = Theme.Bg };

        var startup = MakeCheck("Start with Windows", AutoStart.IsEnabled(), 20, 8, v =>
        {
            _settings.RunAtStartup = v;
            AutoStart.Set(v);
            _settings.Save();
        });

        var keepAddon = MakeCheck("Keep the addon updated", _settings.KeepAddonUpdated, 20, 30, v =>
        {
            _settings.KeepAddonUpdated = v;
            _settings.Save();
        });

        var keepData = MakeCheck("Keep market prices fresh", _settings.KeepMarketDataFresh, 260, 30, v =>
        {
            _settings.KeepMarketDataFresh = v;
            _settings.Save();
        });

        var links = new FlowLayoutPanel
        {
            Location = new Point(18, 60),
            Size = new Size(520, 24),
            BackColor = Color.Transparent,
            FlowDirection = FlowDirection.LeftToRight,
        };
        links.Controls.Add(Theme.MakeLink("thewowdb.com", AppInfo.Site));
        links.Controls.Add(Dot());
        links.Controls.Add(Theme.MakeLink("Addon page", AppInfo.AddonPage));
        links.Controls.Add(Dot());
        var log = Theme.MakeLink("Open log", "");
        log.Links.Clear();
        log.Links.Add(0, log.Text.Length);
        log.LinkClicked += (_, _) => Theme.OpenUrl(AppPaths.LogFile);
        links.Controls.Add(log);

        footer.Controls.AddRange([startup, keepAddon, keepData, links]);
        footer.Paint += (_, e) =>
        {
            using var pen = new Pen(Theme.Border);
            e.Graphics.DrawLine(pen, 0, 0, footer.Width, 0);
        };
        return footer;
    }

    private static Label Dot() => new()
    {
        Text = "·",
        AutoSize = true,
        ForeColor = Theme.Muted,
        BackColor = Color.Transparent,
        Font = Theme.Ui(8.5f),
    };

    private CheckBox MakeCheck(string text, bool value, int x, int y, Action<bool> onChange)
    {
        var cb = new CheckBox
        {
            Text = text,
            Checked = value,
            Location = new Point(x, y),
            AutoSize = true,
            ForeColor = Theme.Text,
            BackColor = Color.Transparent,
            Font = Theme.Ui(8.5f),
            Cursor = Cursors.Hand,
        };
        cb.CheckedChanged += (_, _) => onChange(cb.Checked);
        return cb;
    }

    private void LoadFlavors()
    {
        _list.Controls.Clear();
        _rows.Clear();

        var installs = WowInstallScanner.Scan(_settings.ExtraInstallPaths);
        var flavors = installs.SelectMany(i => i.Flavors).ToList();

        if (flavors.Count == 0)
        {
            _list.Controls.Add(new Label
            {
                Text = "No World of Warcraft installation found.\r\n\r\n" +
                       "Use \"Add WoW folder...\" and pick the folder that contains\r\n" +
                       "_retail_ (usually C:\\Program Files (x86)\\World of Warcraft).",
                AutoSize = true,
                ForeColor = Theme.Muted,
                Font = Theme.Ui(9f),
                Margin = new Padding(4, 8, 0, 0),
            });
            _status.Text = "Waiting for a WoW folder.";
            return;
        }

        foreach (var flavor in flavors)
        {
            var row = new FlavorRow(flavor, _settings.IsFlavorEnabled(flavor.Path), _list.ClientSize.Width - 46);
            row.ToggleChanged += (_, enabled) =>
            {
                _settings.SetFlavorEnabled(flavor.Path, enabled);
                _settings.Save();
            };
            _rows.Add(row);
            _list.Controls.Add(row);
        }

        _status.Text = $"Found {flavors.Count} WoW client{(flavors.Count == 1 ? "" : "s")}.";
    }

    private void AddFolder()
    {
        using var dialog = new FolderBrowserDialog
        {
            Description = "Pick the World of Warcraft folder (the one containing _retail_)",
            UseDescriptionForTitle = true,
            ShowNewFolderButton = false,
        };
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        var picked = dialog.SelectedPath;
        if (WowInstallScanner.FlavorsIn(picked).Count == 0 &&
            WowInstallScanner.Scan(new[] { picked }).Count == 0)
        {
            MessageBox.Show(this,
                "That folder does not look like a World of Warcraft installation.\r\n\r\n" +
                "Pick the folder that contains _retail_ or _classic_era_.",
                AppInfo.Name, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        if (!_settings.ExtraInstallPaths.Contains(picked, StringComparer.OrdinalIgnoreCase))
        {
            _settings.ExtraInstallPaths.Add(picked);
            _settings.Save();
        }
        LoadFlavors();
    }

    /// <summary>Runs a pass and returns its report, so the caller can act on it
    /// too (first-run bookkeeping lives in TrayApp, not in the view).</summary>
    public async Task<SyncReport?> RunSyncAsync()
    {
        if (_busy) return null;
        _busy = true;
        _check.Enabled = false;
        _status.Text = "Checking thewowdb.com...";
        foreach (var row in _rows) row.ShowWorking();

        try
        {
            var report = await _sync(CancellationToken.None);
            _status.Text = $"{report.Summary}  ·  {report.When:HH:mm}";
            _status.ForeColor = report.Ok ? Theme.Muted : Theme.Bad;

            foreach (var row in _rows)
            {
                var match = report.Flavors.FirstOrDefault(f => f.Flavor.Path == row.Flavor.Path);
                if (match is not null) row.ShowResult(match);
            }
            return report;
        }
        catch (Exception ex)
        {
            Log.Error("sync failed", ex);
            _status.Text = "Something went wrong. See the log.";
            _status.ForeColor = Theme.Bad;
            return null;
        }
        finally
        {
            _busy = false;
            _check.Enabled = true;
        }
    }

    public void ExitForReal()
    {
        ReallyExit = true;
        Close();
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        // Closing the window is not quitting; the tray icon says so.
        if (!ReallyExit && e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            Hide();
            return;
        }
        base.OnFormClosing(e);
    }
}
