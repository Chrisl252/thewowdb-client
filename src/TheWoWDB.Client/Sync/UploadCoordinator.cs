using TheWoWDB.Client.Core;
using TheWoWDB.Client.Wow;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// Runs the two Forever uploaders over every account under every Forever flavor,
/// after each sync pass and when the watcher sees the SavedVariables change.
/// Serialized: only one run at a time, so the budget cannot be raced. Owns the
/// persisted <see cref="UploadState"/> and the "last upload" line each flavor row shows.
/// </summary>
public sealed class UploadCoordinator(Settings settings) : IDisposable
{
    private readonly UploadState _state = UploadState.Load();
    private readonly SemaphoreSlim _one = new(1, 1);
    private readonly ForeverWatcher _watcher = new();
    private List<WowFlavor> _flavors = new();
    private bool _wired;

    /// <summary>Raised after a run that changed what a row should say.</summary>
    public event Action? Changed;

    /// <summary>Sync pass finished: remember the manifest switches and the Forever flavors, then upload.</summary>
    public async Task RunAfterSyncAsync(Manifest manifest, IEnumerable<WowFlavor> flavors,
                                        IUploadTransport transport, CancellationToken ct)
    {
        _state.CollectAllowed = manifest.CollectUpload;
        _state.ScanAllowed = manifest.ScanUpload;
        _flavors = flavors.Where(f => f.IsForever).ToList();
        _state.Save();

        if (!_wired)
        {
            _wired = true;
            _watcher.Changed += () => _ = RunFromWatcherAsync();
        }
        _watcher.Watch(_flavors);

        await RunAsync(transport, ct).ConfigureAwait(false);
    }

    private async Task RunFromWatcherAsync()
    {
        try
        {
            using var net = new Downloader($"TheWoWDBClient/{AppInfo.Version} (+https://thewowdb.com)");
            await RunAsync(net, CancellationToken.None).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            Log.Error("upload after a save failed", ex);
        }
    }

    public async Task RunAsync(IUploadTransport transport, CancellationToken ct)
    {
        if (!settings.ShareFindings || !(_state.CollectAllowed || _state.ScanAllowed)) return;
        if (!await _one.WaitAsync(0, ct).ConfigureAwait(false)) return;      // a run is already going
        try
        {
            var sender = new UploadSender(_state, transport);
            var collect = new CollectUploader(_state, sender, AppInfo.Version);
            var scan = new ScanUploader(_state, sender);
            var changed = false;

            foreach (var flavor in _flavors.Where(f => settings.IsFlavorEnabled(f.Path)))
            {
                foreach (var file in ForeverSavedVariables.Files(flavor))
                {
                    ct.ThrowIfCancellationRequested();
                    if (!sender.CanSend(CollectUploader.Door) && !sender.CanSend(ScanUploader.Door)) continue;
                    var text = ForeverSavedVariables.ReadShared(file);
                    if (text is null) continue;

                    if (_state.CollectAllowed && sender.CanSend(CollectUploader.Door))
                        changed |= await collect.RunFileAsync(file, text, ct).ConfigureAwait(false) is not null;
                    if (_state.ScanAllowed && sender.CanSend(ScanUploader.Door))
                        changed |= await scan.RunFileAsync(file, text, ct).ConfigureAwait(false) is not null;
                }
            }

            _state.Save();
            if (changed) Changed?.Invoke();
        }
        finally
        {
            _one.Release();
        }
    }

    /// <summary>The "last upload" line for a Forever flavor row.</summary>
    public string DescribeFor(WowFlavor flavor)
    {
        if (!settings.ShareFindings) return "sharing is off";

        FileUpload? newest = null;
        var prefix = flavor.Path.TrimEnd('\\').ToLowerInvariant() + "\\";
        foreach (var (key, f) in _state.Files)
            if (key.StartsWith(prefix, StringComparison.Ordinal) && f.AtUnix > 0 && (newest is null || f.AtUnix > newest.AtUnix))
                newest = f;

        if (newest is null) return "last upload: none yet";
        var when = DateTimeOffset.FromUnixTimeSeconds(newest.AtUnix).LocalDateTime;
        var day = when.Date == DateTime.Today ? when.ToString("HH:mm") : when.ToString("MMM d HH:mm");
        return $"last upload {day} · {newest.Message}";
    }

    public void Dispose()
    {
        _watcher.Dispose();
        _one.Dispose();
    }
}
