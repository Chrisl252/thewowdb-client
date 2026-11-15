using System.Text;
using System.Text.RegularExpressions;
using TheWoWDB.Client.Core;
using TheWoWDB.Client.Wow;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// Keeps the Forever addon's auction price file fresh: thewowdb.com writes
/// Blizzard's Forever auction data once an hour, one file per region, and this
/// puts the player's region's file at `data/ForeverRealmPrices.lua` inside the
/// TheWoWDB_Forever folder (the addon reads it at login or /reload).
///
/// One concern, one file. Skips when the copy on disk is still fresh, so an
/// unchanged hour costs no download; a file that does not look like the price
/// table is never written.
/// </summary>
public static partial class ForeverPrices
{
    public const string Target = "data/ForeverRealmPrices.lua";
    public static readonly TimeSpan FreshFor = TimeSpan.FromMinutes(50);
    private const int MinBytes = 50_000;

    [GeneratedRegex(@"^\s*SET\s+portal\s+""(\w+)""", RegexOptions.IgnoreCase | RegexOptions.Multiline)]
    private static partial Regex PortalRx();

    [GeneratedRegex(@"\bgenerated\s*=\s*(\d+)")]
    private static partial Regex GeneratedRx();

    /// <summary>"us" or "eu" from the flavor's WTF\Config.wtf (`SET portal "US"`); "us" when unknown.</summary>
    public static string Region(string flavorPath)
    {
        try
        {
            var cfg = Path.Combine(flavorPath, "WTF", "Config.wtf");
            if (File.Exists(cfg))
            {
                var m = PortalRx().Match(File.ReadAllText(cfg));
                if (m.Success && m.Groups[1].Value.Equals("EU", StringComparison.OrdinalIgnoreCase)) return "eu";
            }
        }
        catch (IOException) { /* unreadable config: the default region */ }
        catch (UnauthorizedAccessException) { }
        return "us";
    }

    /// <summary>Epoch seconds the file was generated; 0 for the stub or no stamp.</summary>
    public static long GeneratedOf(string head)
    {
        var m = GeneratedRx().Match(head);
        return m.Success && long.TryParse(m.Groups[1].Value, out var v) ? v : 0;
    }

    /// <summary>Does this look like the v2 price table (and not an error page or the stub)?</summary>
    public static bool LooksValid(byte[] bytes)
    {
        if (bytes.Length < MinBytes) return false;
        var head = Encoding.UTF8.GetString(bytes, 0, Math.Min(bytes.Length, 600));
        return head.Contains("WGF.ForeverRealmPrices", StringComparison.Ordinal)
            && head.Contains("version = 2", StringComparison.Ordinal)
            && GeneratedOf(head) > 0;
    }

    public static bool IsFresh(string addonPath, DateTimeOffset now)
    {
        try
        {
            var file = Path.Combine(addonPath, Target.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(file)) return false;
            using var fs = File.OpenRead(file);
            var buf = new byte[600];
            var n = fs.Read(buf, 0, buf.Length);
            var gen = GeneratedOf(Encoding.UTF8.GetString(buf, 0, n));
            return gen > 0 && now.ToUnixTimeSeconds() - gen < (long)FreshFor.TotalSeconds;
        }
        catch (IOException) { return false; }
    }

    /// <summary>Returns the words to add to the flavor's report, or null when nothing was done.</summary>
    public static async Task<string?> RefreshAsync(WowFlavor flavor, string addonPath, string urlTemplate,
                                                   Downloader net, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        if (!Directory.Exists(addonPath) || IsFresh(addonPath, now)) return null;
        // A new URL each half hour, so an edge cache never hands back last hour's file.
        var url = urlTemplate.Replace("{region}", Region(flavor.Path), StringComparison.Ordinal)
                  + "?h=" + (now.ToUnixTimeSeconds() / 1800);
        string? tmp = null;
        try
        {
            tmp = await net.DownloadToTempAsync(url, null, ct).ConfigureAwait(false);
            var bytes = Downloader.ReadMaybeGzip(tmp, true);
            if (!LooksValid(bytes))
            {
                Log.Info($"{flavor.DisplayName}: price file did not look right, kept the old one");
                return null;
            }
            AddonFolder.WriteFile(addonPath, Target, bytes);
            return "auction prices refreshed";
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            Log.Error($"{flavor.DisplayName} Forever prices failed", ex);
            return null;
        }
        finally
        {
            if (tmp is not null) { try { File.Delete(tmp); } catch { /* harmless leftover */ } }
        }
    }
}
