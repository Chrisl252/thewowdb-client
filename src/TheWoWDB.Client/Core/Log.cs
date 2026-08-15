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

    /// <summary>No BOM: Encoding.UTF8 writes one, and it shows up as a stray
    /// glyph on the first line of a file people open to read an error.</summary>
    private static readonly Encoding Utf8NoBom = new UTF8Encoding(false);

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
                File.AppendAllText(AppPaths.LogFile, line + Environment.NewLine, Utf8NoBom);
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
