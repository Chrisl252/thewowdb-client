using System.Drawing.Drawing2D;

namespace TheWoWDB.Client.Ui;

/// <summary>
/// The site's palette, so the client and thewowdb.com read as one product.
/// Values mirror assets/ah/base.css in the site repo.
/// </summary>
public static class Theme
{
    public static readonly Color Bg = ColorTranslator.FromHtml("#0f0d0a");
    public static readonly Color Panel = ColorTranslator.FromHtml("#1a1815");
    public static readonly Color PanelHi = ColorTranslator.FromHtml("#2a251f");
    public static readonly Color Border = ColorTranslator.FromHtml("#3a3632");
    public static readonly Color Gold = ColorTranslator.FromHtml("#f0c040");
    public static readonly Color GoldDim = ColorTranslator.FromHtml("#caa24e");
    public static readonly Color Text = ColorTranslator.FromHtml("#e8e8f4");
    public static readonly Color Muted = ColorTranslator.FromHtml("#a99e92");
    public static readonly Color Good = ColorTranslator.FromHtml("#6b8c5f");
    public static readonly Color Bad = ColorTranslator.FromHtml("#c9553f");

    public static Font Ui(float size = 9f, FontStyle style = FontStyle.Regular) =>
        new("Segoe UI", size, style);

    /// <summary>A flat gold-on-dark button; WinForms' default chrome ignores dark themes.</summary>
    public static Button MakeButton(string text, bool primary = false)
    {
        var b = new Button
        {
            Text = text,
            FlatStyle = FlatStyle.Flat,
            BackColor = primary ? Gold : Panel,
            ForeColor = primary ? Bg : Text,
            Font = Ui(9f, primary ? FontStyle.Bold : FontStyle.Regular),
            AutoSize = false,
            Height = 30,
            Cursor = Cursors.Hand,
            UseVisualStyleBackColor = false,
        };
        b.FlatAppearance.BorderColor = primary ? Gold : Border;
        b.FlatAppearance.BorderSize = 1;
        b.FlatAppearance.MouseOverBackColor = primary ? GoldDim : PanelHi;
        return b;
    }

    public static LinkLabel MakeLink(string text, string url)
    {
        var l = new LinkLabel
        {
            Text = text,
            AutoSize = true,
            Font = Ui(8.5f),
            LinkColor = GoldDim,
            ActiveLinkColor = Gold,
            VisitedLinkColor = GoldDim,
            LinkBehavior = LinkBehavior.HoverUnderline,
            BackColor = Color.Transparent,
        };
        l.LinkClicked += (_, _) => OpenUrl(url);
        return l;
    }

    public static void OpenUrl(string url)
    {
        try
        {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(url)
            {
                UseShellExecute = true,
            });
        }
        catch (Exception ex)
        {
            Core.Log.Warn($"could not open {url}: {ex.Message}");
        }
    }

    /// <summary>Rounded panel background, drawn by hand because WinForms has no radius.</summary>
    public static void PaintCard(Graphics g, Rectangle bounds, Color fill, Color border, int radius = 6)
    {
        g.SmoothingMode = SmoothingMode.AntiAlias;
        var r = new Rectangle(bounds.X, bounds.Y, bounds.Width - 1, bounds.Height - 1);
        using var path = new GraphicsPath();
        path.AddArc(r.X, r.Y, radius * 2, radius * 2, 180, 90);
        path.AddArc(r.Right - radius * 2, r.Y, radius * 2, radius * 2, 270, 90);
        path.AddArc(r.Right - radius * 2, r.Bottom - radius * 2, radius * 2, radius * 2, 0, 90);
        path.AddArc(r.X, r.Bottom - radius * 2, radius * 2, radius * 2, 90, 90);
        path.CloseFigure();
        using var b = new SolidBrush(fill);
        using var p = new Pen(border);
        g.FillPath(b, path);
        g.DrawPath(p, path);
    }
}
