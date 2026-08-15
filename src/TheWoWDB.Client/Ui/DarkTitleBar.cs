using System.Runtime.InteropServices;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Ui;

/// <summary>
/// Paints the window's title bar dark to match the app.
///
/// WinForms has no API for this; the frame is drawn by the desktop compositor
/// and stays light no matter what the form's colours are, leaving a white bar
/// bolted to a black window. DWM exposes it as an undocumented-ish attribute
/// whose number changed during Windows 10's life, so both are attempted.
/// </summary>
public static class DarkTitleBar
{
    private const int UseImmersiveDarkMode = 20;      // Win10 2004+ and Win11
    private const int UseImmersiveDarkModeOld = 19;   // Win10 1809 .. 1909

    [DllImport("dwmapi.dll", SetLastError = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

    public static void Apply(Form form)
    {
        // The handle has to exist before DWM will accept the attribute.
        if (!form.IsHandleCreated) form.HandleCreated += (_, _) => Set(form.Handle);
        else Set(form.Handle);
    }

    private static void Set(IntPtr handle)
    {
        try
        {
            var on = 1;
            if (DwmSetWindowAttribute(handle, UseImmersiveDarkMode, ref on, sizeof(int)) != 0)
                DwmSetWindowAttribute(handle, UseImmersiveDarkModeOld, ref on, sizeof(int));
        }
        catch (Exception ex)
        {
            // A light title bar is cosmetic; never let it stop the app.
            Log.Warn($"could not darken the title bar: {ex.Message}");
        }
    }
}
