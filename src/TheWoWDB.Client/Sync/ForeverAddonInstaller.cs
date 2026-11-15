using TheWoWDB.Client.Core;
using TheWoWDB.Client.Wow;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// Installs and updates the Forever edition of the addon (TheWoWDB_Forever) in a
/// `_forever_` flavor. Same safety as the retail path, because it goes through the
/// same <see cref="AddonFolder"/>: a junctioned folder is never touched, the zip
/// is hash-verified before use, the swap is staged and rolls back on failure.
/// One instance per sync pass; the zip is downloaded at most once.
/// </summary>
public sealed class ForeverAddonInstaller(Settings settings, Manifest manifest, Downloader net) : IDisposable
{
    private string? _zip;

    public async Task<FlavorReport> RunAsync(WowFlavor flavor, CancellationToken ct)
    {
        var report = await InstallAsync(flavor, ct).ConfigureAwait(false);
        // Prices go in AFTER the addon: a fresh extract carries the empty stub.
        var installed = report.Outcome is FlavorOutcome.UpToDate or FlavorOutcome.Installed or FlavorOutcome.Updated;
        if (installed && settings.KeepMarketDataFresh && manifest.ForeverPrices is { Length: > 0 } url)
        {
            var line = await ForeverPrices.RefreshAsync(
                flavor, AddonFolder.PathIn(flavor, AddonFolder.ForeverAddonName), url, net, ct).ConfigureAwait(false);
            if (line is not null)
                report = report with
                {
                    Outcome = report.Outcome == FlavorOutcome.UpToDate ? FlavorOutcome.DataRefreshed : report.Outcome,
                    Detail = report.Detail + ", " + line,
                };
        }
        return report;
    }

    private async Task<FlavorReport> InstallAsync(WowFlavor flavor, CancellationToken ct)
    {
        var addonPath = AddonFolder.PathIn(flavor, AddonFolder.ForeverAddonName);
        if (AddonFolder.IsDeveloperLink(addonPath))
        {
            Log.Info($"{flavor.DisplayName}: developer junction, left alone");
            return new FlavorReport(flavor, FlavorOutcome.SkippedDeveloperLink, "linked to a source folder, left alone");
        }

        var entry = manifest.ForeverAddon;
        if (entry is not { Url.Length: > 0, Version.Length: > 0 })
            return new FlavorReport(flavor, FlavorOutcome.NoForeverAddon, "Forever addon not published yet");

        if (!settings.KeepAddonUpdated)
            return new FlavorReport(flavor, FlavorOutcome.UpToDate, "addon updates are off");

        try
        {
            var installed = AddonFolder.InstalledVersion(addonPath, AddonFolder.ForeverAddonName);
            if (string.Equals(installed, entry.Version, StringComparison.OrdinalIgnoreCase))
                return new FlavorReport(flavor, FlavorOutcome.UpToDate, $"Forever addon {entry.Version}");

            _zip ??= await net.DownloadToTempAsync(entry.Url, entry.Sha256, ct).ConfigureAwait(false);
            AddonFolder.InstallFromZip(_zip, flavor, AddonFolder.ForeverAddonName);
            return installed is null
                ? new FlavorReport(flavor, FlavorOutcome.Installed, $"installed {entry.Version}")
                : new FlavorReport(flavor, FlavorOutcome.Updated, $"updated {installed} to {entry.Version}");
        }
        catch (DeveloperLinkException)
        {
            return new FlavorReport(flavor, FlavorOutcome.SkippedDeveloperLink, "linked to a source folder, left alone");
        }
        catch (Exception ex)
        {
            Log.Error($"{flavor.DisplayName} Forever addon failed", ex);
            return new FlavorReport(flavor, FlavorOutcome.Failed, ex.Message);
        }
    }

    public void Dispose()
    {
        if (_zip is null) return;
        try { File.Delete(_zip); } catch { /* a leftover temp file is harmless */ }
    }
}
