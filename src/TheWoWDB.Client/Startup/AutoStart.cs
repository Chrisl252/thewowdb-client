using Microsoft.Win32;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Startup;

/// <summary>
/// Start-with-Windows via the per-user Run key. Deliberately HKCU and not a
/// service or scheduled task: no elevation, nothing left behind that the user
/// cannot see and remove from Task Manager's Startup tab.
/// </summary>
public static class AutoStart
{
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string ValueName = "TheWoWDBClient";

    public static bool IsEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey);
            return key?.GetValue(ValueName) is string s && s.Contains("TheWoWDBClient", StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            Log.Warn($"could not read the startup entry: {ex.Message}");
            return false;
        }
    }

    public static void Set(bool enabled)
    {
        try
        {
            using var key = Registry.CurrentUser.CreateSubKey(RunKey, writable: true);
            if (key is null) return;
            if (enabled)
                // --background so an auto-start never pops a window in the user's face.
                key.SetValue(ValueName, $"\"{AppPaths.ExePath}\" --background");
            else
                key.DeleteValue(ValueName, throwOnMissingValue: false);
            Log.Info($"start with Windows: {(enabled ? "on" : "off")}");
        }
        catch (Exception ex)
        {
            Log.Error("could not change the startup entry", ex);
        }
    }
}
