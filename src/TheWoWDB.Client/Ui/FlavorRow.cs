using TheWoWDB.Client.Sync;
using TheWoWDB.Client.Wow;

namespace TheWoWDB.Client.Ui;

/// <summary>One detected WoW client: a toggle, its name, and what we last did to it.</summary>
public sealed class FlavorRow : Panel
{
    private readonly CheckBox _toggle;
    private readonly Label _name;
    private readonly Label _path;
    private readonly Label _state;

    public WowFlavor Flavor { get; }
    /// Named ToggleChanged, not EnabledChanged: Control already has an
/// EnabledChanged event and shadowing it invites subscribing to the wrong one.
    public event EventHandler<bool>? ToggleChanged;

    public FlavorRow(WowFlavor flavor, bool enabled, int width)
    {
        Flavor = flavor;
        Width = width;
        Height = 52;
        Margin = new Padding(0, 0, 0, 6);
        BackColor = Theme.Panel;

        _toggle = new CheckBox
        {
            Checked = enabled,
            AutoSize = true,
            Location = new Point(12, 17),
            BackColor = Theme.Panel,
            ForeColor = Theme.Text,
            Cursor = Cursors.Hand,
        };
        _toggle.CheckedChanged += (_, _) =>
        {
            Refresh();
            ToggleChanged?.Invoke(this, _toggle.Checked);
        };

        _name = new Label
        {
            Text = flavor.DisplayName,
            AutoSize = true,
            Location = new Point(36, 9),
            Font = Theme.Ui(9.5f, FontStyle.Bold),
            ForeColor = Theme.Text,
            BackColor = Color.Transparent,
        };

        _path = new Label
        {
            Text = Compact(flavor.Path),
            AutoSize = false,
            Location = new Point(36, 27),
            Size = new Size(width - 190, 16),
            Font = Theme.Ui(8f),
            ForeColor = Theme.Muted,
            BackColor = Color.Transparent,
            AutoEllipsis = true,
        };

        _state = new Label
        {
            Text = "",
            AutoSize = false,
            TextAlign = ContentAlignment.MiddleRight,
            Location = new Point(width - 200, 18),
            Size = new Size(188, 18),
            Font = Theme.Ui(8.5f),
            ForeColor = Theme.Muted,
            BackColor = Color.Transparent,
        };

        Controls.AddRange([_toggle, _name, _path, _state]);
    }

    public void ShowResult(FlavorReport report)
    {
        (_state.Text, _state.ForeColor) = report.Outcome switch
        {
            FlavorOutcome.Installed => ($"installed · {report.Detail}", Theme.Gold),
            FlavorOutcome.Updated => ($"updated · {report.Detail}", Theme.Gold),
            FlavorOutcome.DataRefreshed => ($"prices refreshed", Theme.Gold),
            FlavorOutcome.UpToDate => ("up to date", Theme.Good),
            FlavorOutcome.SkippedDeveloperLink => ("developer link, untouched", Theme.Muted),
            FlavorOutcome.Disabled => ("off", Theme.Muted),
            FlavorOutcome.Failed => (Shorten(report.Detail), Theme.Bad),
            _ => ("", Theme.Muted),
        };
    }

    public void ShowWorking() { _state.Text = "checking..."; _state.ForeColor = Theme.Muted; }

    protected override void OnPaint(PaintEventArgs e)
    {
        Theme.PaintCard(e.Graphics, ClientRectangle,
                        _toggle.Checked ? Theme.Panel : Theme.Bg, Theme.Border);
        base.OnPaint(e);
    }

    /// <summary>"...\World of Warcraft\_retail_" reads better than the full path.</summary>
    private static string Compact(string path)
    {
        var parts = path.Split(Path.DirectorySeparatorChar);
        return parts.Length <= 3 ? path : "..." + Path.DirectorySeparatorChar +
               string.Join(Path.DirectorySeparatorChar, parts[^2..]);
    }

    private static string Shorten(string s) => s.Length <= 30 ? s : s[..29] + "…";
}
