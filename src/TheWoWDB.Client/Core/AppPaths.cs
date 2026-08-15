namespace TheWoWDB.Client.Core;

/// <summary>Every path the client owns. Nothing else in the app builds one.</summary>
public static class AppPaths
{
    public static string Root { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TheWoWDB");

    public static string SettingsFile => Path.Combine(Root, "settings.json");
    public static string LogFile => Path.Combine(Root, "client.log");
    public static string CacheDir => Path.Combine(Root, "cache");

    /// <summary>The running executable, resolved through the single-file host.</summary>
    public static string ExePath => Environment.ProcessPath
        ?? Path.Combine(AppContext.BaseDirectory, "TheWoWDBClient.exe");

    public static void EnsureCreated()
    {
        Directory.CreateDirectory(Root);
        Directory.CreateDirectory(CacheDir);
    }
}
