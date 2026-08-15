using System.Reflection;
using TheWoWDB.Client.Core;
using TheWoWDB.Client.Startup;
using TheWoWDB.Client.Ui;

namespace TheWoWDB.Client;

/// <summary>
/// Wiring only. Everything this file touches lives behind a named seam:
/// Settings, AutoStart, TrayApp. Nothing about installing addons is decided here.
/// </summary>
internal static class Program
{
    /// <summary>Keeps a second copy from fighting the first over the same addon folders.</summary>
    private static Mutex? _single;

    [STAThread]
    private static void Main(string[] args)
    {
        _single = new Mutex(true, @"Local\TheWoWDBClient", out var isFirst);
        if (!isFirst)
        {
            MessageBox.Show(
                "TheWoWDB Client is already running. Look for the gold coin in your system tray.",
                AppInfo.Name, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
        Application.ThreadException += (_, e) => Log.Error("unhandled UI exception", e.Exception);
        AppDomain.CurrentDomain.UnhandledException += (_, e) =>
            Log.Error("unhandled exception", e.ExceptionObject as Exception);

        AppPaths.EnsureCreated();
        Log.Info($"{AppInfo.Name} {AppInfo.Version} starting ({string.Join(' ', args)})");

        var firstEver = !File.Exists(AppPaths.SettingsFile);
        var settings = Settings.Load();

        // Default to starting with Windows on the very first run: a background
        // updater the user has to launch by hand is not a background updater.
        // The tray menu and the window both expose the switch to turn it off.
        if (firstEver && settings.RunAtStartup && !AutoStart.IsEnabled())
            AutoStart.Set(true);

        // Write the file immediately so state exists from run one. Saving only
        // when the user touches a control meant a first run that changed nothing
        // left no settings at all, and every later launch looked like a first run.
        if (firstEver) settings.Save();

        var startHidden = args.Any(a =>
            a.Equals("--background", StringComparison.OrdinalIgnoreCase) ||
            a.Equals("-b", StringComparison.OrdinalIgnoreCase));

        using var icon = LoadIcon();
        Application.Run(new TrayApp(settings, icon, startHidden));
    }

    private static Icon LoadIcon()
    {
        try
        {
            using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("app.ico");
            if (stream is not null) return new Icon(stream);
        }
        catch (Exception ex)
        {
            Log.Warn($"embedded icon unavailable: {ex.Message}");
        }
        return SystemIcons.Application;
    }
}
