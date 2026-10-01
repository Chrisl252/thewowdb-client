using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using TheWoWDB.Client.Core;
using TheWoWDB.Client.Wow;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// Crowdsourced game data the client files do not carry: herb and ore node
/// spots, disenchant results and vendor costs. The Companion addon (0.13.0+,
/// modules/collect.lua) records them while the player plays and, at logout,
/// writes them as ONE line (the "wire", starting TWDBC1~) into its own
/// SavedVariables file. With the player's opt-in this lifts that line out and
/// sends it to thewowdb.com, which validates it and shows a fact only once two
/// different players have reported it.
///
/// Two switches, both off by default: <see cref="Settings.ShareGameData"/> (the
/// player) and the manifest's <c>collect_upload</c> entry (the site). Only our
/// own addon's SavedVariables files are opened (WGFCompanion.lua,
/// TheWoWDB_Forever.lua, TheWoWDB_Era.lua), and only the wire string is sent:
/// it holds ids, map coordinates, counts and prices, never a player, account,
/// guild or realm name. The WTF account folder name is never sent.
/// </summary>
public static class CollectUploader
{
    private static readonly string[] AddonFiles = ["WGFCompanion.lua", "TheWoWDB_Forever.lua", "TheWoWDB_Era.lua"];
    private const long MaxFileBytes = 64L * 1024 * 1024;
    private const int MaxWires = 3;
    // The wire is written by the addon with no quote, backslash or newline in it,
    // so it is the whole of one Lua string literal.
    private static readonly Regex Wire = new("\"(TWDBC1~[^\"\\\\\\r\\n]{1,1500000})\"", RegexOptions.CultureInvariant);

    public static async Task RunAsync(Settings settings, Manifest manifest,
                                      IReadOnlyList<WowInstall> installs, Downloader net,
                                      CancellationToken ct)
    {
        if (!settings.ShareGameData
            || manifest.CollectUpload is not { Enabled: true, Url.Length: > 0 } entry)
            return;
        try
        {
            var wires = new List<string>();
            foreach (var flavor in installs.SelectMany(i => i.Flavors))
            {
                var accounts = Path.Combine(flavor.Path, "WTF", "Account");
                if (!Directory.Exists(accounts)) continue;
                foreach (var account in Directory.EnumerateDirectories(accounts))
                {
                    foreach (var name in AddonFiles)
                    {
                        var path = Path.Combine(account, "SavedVariables", name);
                        var wire = await ReadWireAsync(path, ct).ConfigureAwait(false);
                        if (wire is not null && !wires.Contains(wire)) wires.Add(wire);
                    }
                }
            }
            if (wires.Count == 0) return;
            wires = wires.OrderByDescending(w => w.Length).Take(MaxWires).ToList();

            var sha = Convert.ToHexString(SHA256.HashData(
                Encoding.UTF8.GetBytes(string.Join("\n", wires.OrderBy(w => w, StringComparer.Ordinal)))))
                .ToLowerInvariant();
            if (sha == settings.LastGameDataSha)
            {
                Log.Info("collected game data unchanged since the last upload, not sent");
                return;
            }

            var allOk = true;
            foreach (var wire in wires)
            {
                var (status, body) = await net.PostJsonAsync(entry.Url,
                    new Dictionary<string, string> { ["wire"] = wire, ["client"] = AppInfo.Version },
                    ct).ConfigureAwait(false);
                Log.Info($"game data upload ({wire.Length} chars): HTTP {status} {body.Replace('\n', ' ')}");
                allOk &= status is >= 200 and < 300;
            }
            if (allOk)
            {
                settings.LastGameDataSha = sha;
                settings.Save();
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // A courtesy upload never fails the sync pass that keeps the addon working.
            Log.Error("game data upload failed", ex);
        }
    }

    private static async Task<string?> ReadWireAsync(string path, CancellationToken ct)
    {
        if (!File.Exists(path) || new FileInfo(path).Length > MaxFileBytes) return null;
        // The game may be writing the file at logout: share read/write and read it whole.
        await using var fs = new FileStream(path, FileMode.Open, FileAccess.Read,
                                            FileShare.ReadWrite | FileShare.Delete);
        using var reader = new StreamReader(fs, Encoding.UTF8);
        var text = await reader.ReadToEndAsync(ct).ConfigureAwait(false);
        var m = Wire.Match(text);
        return m.Success ? m.Groups[1].Value : null;
    }
}
