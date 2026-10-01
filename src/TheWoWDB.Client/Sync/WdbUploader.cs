using System.Security.Cryptography;
using TheWoWDB.Client.Core;
using TheWoWDB.Client.Wow;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// Crowdsourced WoW Forever coverage. Quest text and NPC names are not in the
/// game files: the server sends them to whoever meets the quest or NPC, and the
/// client keeps them in Cache/WDB/enUS. With the player's opt-in this sends the
/// two cache files that hold them (questcache.wdb, creaturecache.wdb) to
/// thewowdb.com, which validates and parses them on its side.
///
/// Two switches, both off by default: <see cref="Settings.ShareForeverCache"/>
/// (the player) and the manifest's <c>wdb_upload</c> entry (the site). Only the
/// _classic_beta_ flavor (WoW Forever) is read. Nothing else in the WoW folder
/// is opened, and no account, character or WTF data is ever read or sent.
/// </summary>
public static class WdbUploader
{
    private static readonly string[] Files = ["questcache", "creaturecache"];
    private const int MaxFileBytes = 8 * 1024 * 1024;
    private const int HeaderBytes = 24;

    public static async Task RunAsync(Settings settings, Manifest manifest,
                                      IReadOnlyList<WowInstall> installs, Downloader net,
                                      CancellationToken ct)
    {
        if (!settings.ShareForeverCache
            || manifest.WdbUpload is not { Enabled: true, Url.Length: > 0 } entry)
            return;
        try
        {
            var flavor = installs.SelectMany(i => i.Flavors)
                                 .FirstOrDefault(f => f.Name == "_classic_beta_");
            if (flavor is null) return;
            var dir = Path.Combine(flavor.Path, "Cache", "WDB", "enUS");

            var files = new Dictionary<string, byte[]>();
            foreach (var name in Files)
            {
                var path = Path.Combine(dir, name + ".wdb");
                if (!File.Exists(path) || new FileInfo(path).Length > MaxFileBytes) continue;
                // The game may hold the file open: share read/write and read it whole.
                await using var fs = new FileStream(path, FileMode.Open, FileAccess.Read,
                                                    FileShare.ReadWrite | FileShare.Delete);
                using var ms = new MemoryStream();
                await fs.CopyToAsync(ms, ct).ConfigureAwait(false);
                if (ms.Length > HeaderBytes) files[name] = ms.ToArray();
            }
            if (files.Count == 0) return;

            var sha = Convert.ToHexString(SHA256.HashData(
                files.OrderBy(f => f.Key).SelectMany(f => f.Value).ToArray())).ToLowerInvariant();
            if (sha == settings.LastForeverCacheSha)
            {
                Log.Info("forever cache unchanged since the last upload, not sent");
                return;
            }

            var (status, body) = await net.PostFilesAsync(entry.Url, files,
                new Dictionary<string, string> { ["flavor"] = flavor.Name, ["client"] = AppInfo.Version },
                ct).ConfigureAwait(false);
            Log.Info($"forever cache upload: HTTP {status} {body.Replace('\n', ' ')}");
            if (status is >= 200 and < 300)
            {
                settings.LastForeverCacheSha = sha;
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
            Log.Error("forever cache upload failed", ex);
        }
    }
}
