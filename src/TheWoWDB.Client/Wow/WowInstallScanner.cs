using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Win32;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Wow;

/// <summary>
/// Finds World of Warcraft without asking the user where it is.
///
/// There is no single reliable source. Blizzard does not always write the
/// legacy registry key, Battle.net.config does not carry game paths on every
/// machine, and people move the folder to another drive. So this tries four
/// cheap sources and unions the results; the user can always add a path by hand.
/// </summary>
public static class WowInstallScanner
{
    /// <summary>Every flavor directory Blizzard ships, newest naming included.</summary>
    private static readonly string[] KnownFlavors = WowFlavors.KnownDirectories;

    public static List<WowInstall> Scan(IEnumerable<string>? extraPaths = null)
    {
        var roots = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var source in new Func<IEnumerable<string>>[]
                 { FromRegistry, FromProductDb, FromCommonPaths })
        {
            try
            {
                foreach (var r in source()) roots.Add(TrimToWowRoot(r));
            }
            catch (Exception ex)
            {
                Log.Warn($"install scan source failed: {ex.Message}");
            }
        }

        foreach (var extra in extraPaths ?? Enumerable.Empty<string>())
            if (!string.IsNullOrWhiteSpace(extra)) roots.Add(TrimToWowRoot(extra));

        var installs = new List<WowInstall>();
        foreach (var root in roots)
        {
            var flavors = FlavorsIn(root);
            if (flavors.Count > 0) installs.Add(new WowInstall(root, flavors));
        }

        installs.Sort((a, b) => string.Compare(a.Root, b.Root, StringComparison.OrdinalIgnoreCase));
        return installs;
    }

    /// <summary>
    /// Accept either the install root or a flavor folder. Users hand us
    /// "...\World of Warcraft\_retail_" constantly, and silently doing the right
    /// thing beats an error dialog.
    /// </summary>
    private static string TrimToWowRoot(string path)
    {
        path = path.Trim().Trim('"').TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var leaf = Path.GetFileName(path);
        if (WowFlavors.IsFlavorDirectoryName(leaf))
            return Path.GetDirectoryName(path) ?? path;
        // ...\_retail_\Interface\AddOns and anything under it
        var idx = path.IndexOf(@"\Interface\", StringComparison.OrdinalIgnoreCase);
        if (idx > 0) return TrimToWowRoot(path[..idx]);
        return path;
    }

    public static List<WowFlavor> FlavorsIn(string root)
    {
        var found = new List<WowFlavor>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (!Directory.Exists(root)) return found;

        foreach (var name in KnownFlavors)
            TryAddFlavor(root, name, found, seen);

        // Blizzard adds flavor folders faster than we ship. Any other _name_
        // that actually looks playable is a client the user can enable, not a
        // silent skip. Forever's launch folder is the case this is for.
        try
        {
            foreach (var dir in Directory.EnumerateDirectories(root))
            {
                var name = Path.GetFileName(dir);
                if (!WowFlavors.IsFlavorDirectoryName(name)) continue;
                TryAddFlavor(root, name, found, seen);
            }
        }
        catch (Exception ex)
        {
            Log.Warn($"could not enumerate flavors in {root}: {ex.Message}");
        }

        return found;
    }

    private static void TryAddFlavor(string root, string name, List<WowFlavor> found, HashSet<string> seen)
    {
        if (!seen.Add(name)) return;
        var dir = Path.Combine(root, name);
        if (Directory.Exists(dir) && LooksPlayable(dir))
            found.Add(new WowFlavor(name, dir));
    }

    /// <summary>
    /// A flavor counts only if the game actually lives there. An empty leftover
    /// "_ptr_" folder would otherwise collect addon installs nobody ever loads.
    /// </summary>
    private static bool LooksPlayable(string flavorDir)
    {
        if (Directory.Exists(Path.Combine(flavorDir, "Interface"))) return true;
        if (Directory.Exists(Path.Combine(flavorDir, "WTF"))) return true;
        foreach (var exe in new[]
                 {
                     "Wow.exe", "WowClassic.exe", "WowT.exe", "WowB.exe",
                     "WowClassicT.exe", "WowClassicB.exe", "WowForever.exe",
                 })
            if (File.Exists(Path.Combine(flavorDir, exe))) return true;
        return false;
    }

    private static IEnumerable<string> FromRegistry()
    {
        var keys = new (RegistryHive Hive, string Path, string Value)[]
        {
            (RegistryHive.LocalMachine, @"SOFTWARE\WOW6432Node\Blizzard Entertainment\World of Warcraft", "InstallPath"),
            (RegistryHive.LocalMachine, @"SOFTWARE\Blizzard Entertainment\World of Warcraft", "InstallPath"),
            (RegistryHive.LocalMachine, @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\World of Warcraft", "InstallLocation"),
            (RegistryHive.LocalMachine, @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\World of Warcraft", "InstallLocation"),
        };

        foreach (var (hive, path, value) in keys)
        {
            string? v = null;
            try
            {
                using var baseKey = RegistryKey.OpenBaseKey(hive, RegistryView.Default);
                using var key = baseKey.OpenSubKey(path);
                v = key?.GetValue(value) as string;
            }
            catch { /* a missing or ACL'd key is normal, not an error */ }
            if (!string.IsNullOrWhiteSpace(v)) yield return v!;
        }
    }

    /// <summary>
    /// Battle.net's agent database is a protobuf blob, but the install paths sit
    /// in it as plain text. Scraping the strings is far cheaper and far more
    /// robust than parsing a schema Blizzard changes whenever it likes.
    /// </summary>
    private static IEnumerable<string> FromProductDb()
    {
        var db = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "Battle.net", "Agent", "product.db");
        if (!File.Exists(db)) yield break;

        string text;
        try { text = Encoding.ASCII.GetString(File.ReadAllBytes(db)); }
        catch (Exception ex) { Log.Warn($"product.db unreadable: {ex.Message}"); yield break; }

        var rx = new Regex(@"[A-Za-z]:[\\/][ -~]{0,160}?World of Warcraft(?: Forever)?(?![ -~])",
                           RegexOptions.IgnoreCase);
        foreach (Match m in rx.Matches(text))
            yield return m.Value.Replace('/', '\\');
    }

    private static IEnumerable<string> FromCommonPaths()
    {
        var relative = new[]
        {
            @"Program Files (x86)\World of Warcraft",
            @"Program Files\World of Warcraft",
            @"World of Warcraft",
            @"World of Warcraft Forever",
            @"Games\World of Warcraft",
            @"Games\World of Warcraft Forever",
            @"Blizzard\World of Warcraft",
            @"Battle.net\World of Warcraft",
        };

        foreach (var drive in DriveInfo.GetDrives())
        {
            if (drive.DriveType != DriveType.Fixed) continue;
            bool ready;
            try { ready = drive.IsReady; } catch { continue; }
            if (!ready) continue;

            foreach (var rel in relative)
            {
                var candidate = Path.Combine(drive.RootDirectory.FullName, rel);
                if (Directory.Exists(candidate)) yield return candidate;
            }
        }
    }
}
