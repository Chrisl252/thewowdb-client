using TheWoWDB.Client.Core;
using TheWoWDB.Client.Wow;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// Watches each Forever flavor's `WTF\Account` tree for `TheWoWDB_Forever.lua`
/// being rewritten (the game does that on logout or /reload) and raises
/// <see cref="Changed"/> once, after the writes stop. Debounced, because a save
/// is several change events and the file is read only after it is complete.
/// </summary>
public sealed class ForeverWatcher : IDisposable
{
    private static readonly TimeSpan Debounce = TimeSpan.FromSeconds(20);

    private readonly List<FileSystemWatcher> _watchers = new();
    private readonly object _gate = new();
    private readonly System.Threading.Timer _timer;
    private HashSet<string> _roots = new(StringComparer.OrdinalIgnoreCase);

    public event Action? Changed;

    public ForeverWatcher() => _timer = new System.Threading.Timer(_ => Fire(), null, Timeout.Infinite, Timeout.Infinite);

    /// <summary>Point the watchers at exactly these flavors; unchanged roots keep their watcher.</summary>
    public void Watch(IEnumerable<WowFlavor> foreverFlavors)
    {
        var wanted = foreverFlavors.Select(ForeverSavedVariables.AccountRoot)
                                   .Where(Directory.Exists)
                                   .ToHashSet(StringComparer.OrdinalIgnoreCase);
        lock (_gate)
        {
            if (wanted.SetEquals(_roots)) return;
            foreach (var w in _watchers) w.Dispose();
            _watchers.Clear();
            _roots = wanted;
            foreach (var root in wanted)
            {
                try
                {
                    var w = new FileSystemWatcher(root, ForeverSavedVariables.FileName)
                    {
                        IncludeSubdirectories = true,
                        NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.Size,
                    };
                    w.Changed += (_, _) => Poke();
                    w.Created += (_, _) => Poke();
                    w.Renamed += (_, _) => Poke();
                    w.EnableRaisingEvents = true;
                    _watchers.Add(w);
                }
                catch (Exception ex)
                {
                    Log.Warn($"could not watch {root}: {ex.Message}");
                }
            }
        }
    }

    private void Poke() => _timer.Change(Debounce, Timeout.InfiniteTimeSpan);

    private void Fire()
    {
        try { Changed?.Invoke(); }
        catch (Exception ex) { Log.Error("watcher handler failed", ex); }
    }

    public void Dispose()
    {
        lock (_gate)
        {
            foreach (var w in _watchers) w.Dispose();
            _watchers.Clear();
        }
        _timer.Dispose();
    }
}
