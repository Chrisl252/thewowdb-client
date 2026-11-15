using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Wow;

/// <summary>Where the Forever addon's SavedVariables live, and the one shared-read of them.</summary>
public static class ForeverSavedVariables
{
    public const string FileName = AddonFolder.ForeverAddonName + ".lua";

    /// <summary>`WTF\Account` of a flavor; the folder to watch.</summary>
    public static string AccountRoot(WowFlavor flavor) => Path.Combine(flavor.Path, "WTF", "Account");

    /// <summary>Every account's `TheWoWDB_Forever.lua` that exists under this flavor.</summary>
    public static IReadOnlyList<string> Files(WowFlavor flavor)
    {
        var found = new List<string>();
        try
        {
            var root = AccountRoot(flavor);
            if (!Directory.Exists(root)) return found;
            foreach (var account in Directory.EnumerateDirectories(root))
            {
                var file = Path.Combine(account, "SavedVariables", FileName);
                if (File.Exists(file)) found.Add(file);
            }
        }
        catch (Exception ex)
        {
            Log.Warn($"could not list Forever SavedVariables: {ex.Message}");
        }
        return found;
    }

    /// <summary>
    /// Read the file while the game may still have it open (shared read). Null when
    /// it is mid-write, locked, absurdly large or not valid text: the next trigger tries again.
    /// </summary>
    public static string? ReadShared(string path, long maxBytes = 64L * 1024 * 1024)
    {
        try
        {
            var info = new FileInfo(path);
            if (!info.Exists || info.Length == 0 || info.Length > maxBytes) return null;
            // The game writes on logout or /reload; give it a moment to finish.
            if (DateTime.UtcNow - info.LastWriteTimeUtc < TimeSpan.FromSeconds(3)) return null;
            using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            using var reader = new StreamReader(fs, System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            return reader.ReadToEnd();
        }
        catch (Exception ex)
        {
            Log.Warn($"could not read {Path.GetFileName(path)}: {ex.Message}");
            return null;
        }
    }
}
