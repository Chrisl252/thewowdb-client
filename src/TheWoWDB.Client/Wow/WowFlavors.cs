using System.Text.RegularExpressions;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Wow;

/// <summary>
/// Every playable client folder Blizzard ships, and the human names the UI
/// should use for them. Scanner, display and the Forever stamp all read this
/// so a new flavor is one row plus whatever the folder is actually called.
/// </summary>
public static class WowFlavors
{
    /// <summary>
    /// Known flavor directories, newest naming included. Order is the order
    /// rows appear in the window. Unknown <c>_name_</c> folders that look
    /// playable are appended after these.
    /// </summary>
    public static readonly string[] KnownDirectories =
    {
        "_retail_",
        "_classic_",
        "_classic_era_",
        "_anniversary_",
        "_classic_ptr_",
        "_classic_beta_",
        "_ptr_",
        "_xptr_",
        "_beta_",
        // WoW: Forever. Internally Camelot; Battle.net's 2026 beta reused the
        // wow_classic_beta product, which lands in _classic_beta_. The Camelot
        // / Forever names are what launch-day folders are expected to be.
        "_camelot_",
        "_forever_",
        "_wow_forever_",
        "_classic_forever_",
        "_camelot_beta_",
        "_forever_beta_",
        "_camelot_ptr_",
        "_forever_ptr_",
    };

    /// <summary>
    /// Forever beta's interface number (patch 1.60.1). Midnight numbers ride
    /// along in case a build still reports the Mainline family version.
    /// </summary>
    public const string CamelotInterface = "16001, 120105, 120100, 120007";

    public static bool IsFlavorDirectoryName(string? name)
    {
        if (string.IsNullOrEmpty(name) || name.Length < 3) return false;
        return name[0] == '_' && name[^1] == '_';
    }

    public static string DisplayName(string name, string? path = null)
    {
        if (IsForever(name, path))
        {
            var key = Normalize(name);
            if (key.Contains("ptr", StringComparison.Ordinal)) return "Forever PTR";
            if (key.Contains("beta", StringComparison.Ordinal) || key == "classic_beta")
                return "Forever Beta";
            return "Forever";
        }

        return name switch
        {
            "_retail_" => "Retail",
            "_classic_" => "Classic",
            "_classic_era_" => "Classic Era",
            "_classic_ptr_" => "Classic PTR",
            "_classic_beta_" => "Classic Beta",
            "_ptr_" => "PTR",
            "_xptr_" => "PTR 2",
            "_beta_" => "Beta",
            "_anniversary_" => "Anniversary",
            _ => Humanize(name),
        };
    }

    public static bool IsForever(string name, string? path = null)
    {
        var key = Normalize(name);
        if (key.Contains("forever", StringComparison.Ordinal) ||
            key.Contains("camelot", StringComparison.Ordinal))
            return true;

        // Battle.net installed the Forever beta under the classic-beta product
        // (wow_classic_beta -> _classic_beta_). A Mists/Cata/etc. classic beta
        // would have a 2.x-5.x build stamp; treat that as Classic Beta instead.
        if (key == "classic_beta")
            return !LooksLikeClassicProgression(path);

        return false;
    }

    /// <summary>
    /// True when the flavor directory itself looks like a Classic progression
    /// beta (Mists, Cata, Wrath, TBC) rather than Forever's 1.60.x numbering.
    /// Missing or unreadable stamps are treated as "not classic progression"
    /// because that is the Forever-beta default in 2026.
    /// </summary>
    internal static bool LooksLikeClassicProgression(string? flavorDir)
    {
        var hint = ReadFlavorHint(flavorDir);
        if (string.IsNullOrEmpty(hint)) return false;
        if (hint.Contains("forever", StringComparison.OrdinalIgnoreCase)) return false;
        if (hint.Contains("camelot", StringComparison.OrdinalIgnoreCase)) return false;
        if (hint.Contains("1.60", StringComparison.Ordinal)) return false;
        if (Regex.IsMatch(hint, @"\b[2-5]\.\d")) return true;
        if (hint.Contains("mists", StringComparison.OrdinalIgnoreCase)) return true;
        if (hint.Contains("cataclysm", StringComparison.OrdinalIgnoreCase)) return true;
        if (hint.Contains("wrath", StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    private static string Normalize(string name) =>
        name.Trim().Trim('_').Replace('-', '_').ToLowerInvariant();

    private static string Humanize(string name)
    {
        var trimmed = name.Trim('_').Replace('_', ' ').Trim();
        return string.IsNullOrEmpty(trimmed) ? name : trimmed;
    }

    /// <summary>
    /// Cheap identity sniff: a handful of tiny files Blizzard drops next to
    /// Wow.exe, never the multi-gig Data tree.
    /// </summary>
    private static string? ReadFlavorHint(string? flavorDir)
    {
        if (string.IsNullOrWhiteSpace(flavorDir) || !Directory.Exists(flavorDir))
            return null;

        var pieces = new List<string>();
        foreach (var file in new[] { ".build.info", ".flavor.info", "build.txt", "flavor.info" })
        {
            var path = Path.Combine(flavorDir, file);
            try
            {
                if (!File.Exists(path)) continue;
                using var stream = File.OpenRead(path);
                var buf = new byte[4096];
                var n = stream.Read(buf, 0, buf.Length);
                if (n > 0) pieces.Add(System.Text.Encoding.ASCII.GetString(buf, 0, n));
            }
            catch (Exception ex)
            {
                Log.Warn($"could not read {path}: {ex.Message}");
            }
        }
        return pieces.Count == 0 ? null : string.Join('\n', pieces);
    }
}
