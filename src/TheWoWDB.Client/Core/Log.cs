using System.Text;

namespace TheWoWDB.Client.Core;

/// <summary>
/// A single rolling log file. The client runs unattended in a tray, so when a
/// user says "it didn't update" this file is the only evidence that exists.
/// </summary>
public static class Log
{
    private const long MaxBytes = 512 * 1024;
    private static readonly object Gate = new();

    public static void Info(string message) => Write("INFO ", message);
    public static void Warn(string message) => Write("WARN ", message);

    public static void Error(string message, Exception? ex = null) =>
        Write("ERROR", ex is null ? message : $"{message}: {ex.GetType().Name}: {ex.Message}");

    private static void Write(string level, string message)
    {
        var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} {level} {message}";
        try
        {
            lock (Gate)
            {
                AppPaths.EnsureCreated();
                Roll();
                File.AppendAllText(AppPaths.LogFile, line + Environment.NewLine, Encoding.UTF8);
            }
        }
        catch
        {
            // Logging must never be the reason the client dies.
        }
    }

    private static void Roll()
    {
        var info = new FileInfo(AppPaths.LogFile);
        if (!info.Exists || info.Length < MaxBytes) return;
        var old = AppPaths.LogFile + ".1";
        File.Delete(old);
        File.Move(AppPaths.LogFile, old);
    }
}
