using System.Text;
using System.Text.RegularExpressions;
using TheWoWDB.Client.Core;
using TheWoWDB.Client.Wow;

namespace TheWoWDB.Client.Sync;

public enum FlavorOutcome { UpToDate, Installed, Updated, DataRefreshed, SkippedDeveloperLink, Disabled, Failed }

public sealed record FlavorReport(WowFlavor Flavor, FlavorOutcome Outcome, string Detail);

public sealed record SyncReport(
    bool Ok,
    string Summary,
    IReadOnlyList<FlavorReport> Flavors,
    Manifest? Manifest,
    DateTime When)
{
    public bool AnyChange => Flavors.Any(f =>
        f.Outcome is FlavorOutcome.Installed or FlavorOutcome.Updated or FlavorOutcome.DataRefreshed);
}

/// <summary>
/// One sync pass: read the manifest, then bring every enabled WoW flavor in
/// line with it. Installing the addon and refreshing its market data are
/// separate steps because the second is the whole reason this client exists --
/// WoW addons cannot fetch anything themselves, so packaged prices are only as
/// fresh as whatever last wrote the file.
/// </summary>
public sealed class SyncService(Settings settings, string manifestUrl)
{
    private readonly Settings _settings = settings;
    private readonly string _manifestUrl = manifestUrl;

    public async Task<SyncReport> RunAsync(CancellationToken ct = default)
    {
        var reports = new List<FlavorReport>();
        using var net = new Downloader($"TheWoWDBClient/{AppInfo.Version} (+https://thewowdb.com)");

        Manifest manifest;
        try
        {
            manifest = await net.GetManifestAsync(_manifestUrl, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            Log.Error("could not read the update manifest", ex);
            return new SyncReport(false, "Could not reach thewowdb.com. Will retry later.",
                                  reports, null, DateTime.Now);
        }

        var installs = WowInstallScanner.Scan(_settings.ExtraInstallPaths);
        if (installs.Count == 0)
        {
            return new SyncReport(false,
                "No World of Warcraft installation found. Add yours in the client window.",
                reports, manifest, DateTime.Now);
        }

        // Downloaded at most once per pass, then reused for every flavor.
        string? addonZip = null;
        byte[]? marketData = null;

        foreach (var flavor in installs.SelectMany(i => i.Flavors))
        {
            ct.ThrowIfCancellationRequested();

            if (!_settings.IsFlavorEnabled(flavor.Path))
            {
                reports.Add(new FlavorReport(flavor, FlavorOutcome.Disabled, "turned off"));
                continue;
            }

            var addonPath = AddonFolder.PathIn(flavor);
            if (AddonFolder.IsDeveloperLink(addonPath))
            {
                Log.Info($"{flavor.DisplayName}: developer junction, left alone");
                reports.Add(new FlavorReport(flavor, FlavorOutcome.SkippedDeveloperLink,
                                             "linked to a source folder, left alone"));
                continue;
            }

            try
            {
                var outcome = FlavorOutcome.UpToDate;
                var detail = new List<string>();

                var installed = AddonFolder.InstalledVersion(addonPath);
                if (_settings.KeepAddonUpdated && manifest.Addon is { Url.Length: > 0 } addon
                    && !string.Equals(installed, addon.Version, StringComparison.OrdinalIgnoreCase))
                {
                    addonZip ??= await net.DownloadToTempAsync(addon.Url, addon.Sha256, ct).ConfigureAwait(false);
                    AddonFolder.InstallFromZip(addonZip, flavor);
                    outcome = installed is null ? FlavorOutcome.Installed : FlavorOutcome.Updated;
                    detail.Add(installed is null
                        ? $"installed {addon.Version}"
                        : $"updated {installed} to {addon.Version}");
                    // A fresh extract carries the data file that shipped in the
                    // zip, so whatever we knew about the on-disk build is void.
                }

                if (_settings.KeepMarketDataFresh && manifest.Data is { Url.Length: > 0 } data
                    && Directory.Exists(addonPath))
                {
                    var localBuild = ReadDataBuild(Path.Combine(addonPath, data.Target));
                    if (localBuild != data.Build)
                    {
                        if (marketData is null)
                        {
                            var tmp = await net.DownloadToTempAsync(data.Url, data.Sha256, ct).ConfigureAwait(false);
                            try { marketData = Downloader.ReadMaybeGzip(tmp, data.Gzip); }
                            finally { TryDelete(tmp); }
                        }
                        AddonFolder.WriteFile(addonPath, data.Target, marketData);
                        if (outcome == FlavorOutcome.UpToDate) outcome = FlavorOutcome.DataRefreshed;
                        detail.Add($"market data {data.Build}");
                    }
                }

                reports.Add(new FlavorReport(flavor, outcome,
                    detail.Count > 0 ? string.Join(", ", detail) : "already current"));
            }
            catch (DeveloperLinkException)
            {
                reports.Add(new FlavorReport(flavor, FlavorOutcome.SkippedDeveloperLink,
                                             "linked to a source folder, left alone"));
            }
            catch (Exception ex)
            {
                Log.Error($"{flavor.DisplayName} failed", ex);
                reports.Add(new FlavorReport(flavor, FlavorOutcome.Failed, ex.Message));
            }
        }

        TryDelete(addonZip);

        var changed = reports.Count(r => r.Outcome is FlavorOutcome.Installed
                                          or FlavorOutcome.Updated or FlavorOutcome.DataRefreshed);
        var failed = reports.Count(r => r.Outcome == FlavorOutcome.Failed);
        var summary = failed > 0
            ? $"{failed} of {reports.Count} clients could not be updated."
            : changed > 0
                ? $"Updated {changed} of {reports.Count} clients."
                : "Everything is already up to date.";

        Log.Info(summary);
        return new SyncReport(failed == 0, summary, reports, manifest, DateTime.Now);
    }

    /// <summary>
    /// Pull the export datestamp out of MarketData.lua without parsing 3 MB of
    /// Lua: it is the first key in the table, so the opening bytes are enough.
    /// </summary>
    private static long ReadDataBuild(string path)
    {
        try
        {
            if (!File.Exists(path)) return -1;
            using var stream = File.OpenRead(path);
            var head = new byte[512];
            var read = stream.Read(head, 0, head.Length);
            var text = Encoding.UTF8.GetString(head, 0, read);
            var m = Regex.Match(text, @"\[""build""\]\s*=\s*(\d+)");
            return m.Success && long.TryParse(m.Groups[1].Value, out var build) ? build : -1;
        }
        catch
        {
            return -1;
        }
    }

    private static void TryDelete(string? path)
    {
        if (path is null) return;
        try { File.Delete(path); } catch { /* a leftover temp file is harmless */ }
    }
}
