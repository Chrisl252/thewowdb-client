namespace TheWoWDB.Client.Sync;

/// <summary>
/// The client-side rate guard, one home for every number. Stricter than the
/// server (4/hour, 12/day per IP) so a player on a shared IP is never the one
/// who trips it. EACH DOOR HAS ITS OWN BUDGET: with one shared gap the collected
/// data (which changes at every logout) always went first and the auction scan
/// from the same logout was blocked. Pure over an <see cref="UploadState"/> and an injected clock.
/// </summary>
public sealed class UploadBudget(UploadState state)
{
    public static readonly TimeSpan MinGap = TimeSpan.FromMinutes(20);
    public const int MaxPerDay = 10;
    public static readonly TimeSpan DoorOffWait = TimeSpan.FromHours(6);
    public static readonly TimeSpan FailureWait = TimeSpan.FromHours(1);
    private static readonly TimeSpan Day = TimeSpan.FromHours(24);

    private readonly UploadState _s = state;

    /// <summary>May a POST to <paramref name="door"/> be made now? When not, says why and until when.</summary>
    public (bool Allowed, string Reason, DateTimeOffset? Until) Check(string door, DateTimeOffset now)
    {
        var nowU = now.ToUnixTimeSeconds();
        var attempts = _s.Door(door).Attempts;
        attempts.RemoveAll(t => nowU - t > (long)Day.TotalSeconds);

        var notBefore = _s.Door(door).NotBeforeUnix;
        if (notBefore > nowU)
            return (false, "cooling down", DateTimeOffset.FromUnixTimeSeconds(notBefore));

        if (attempts.Count > 0)
        {
            var next = attempts.Max() + (long)MinGap.TotalSeconds;
            if (next > nowU)
                return (false, "at most one upload every 20 minutes", DateTimeOffset.FromUnixTimeSeconds(next));
        }
        if (attempts.Count >= MaxPerDay)
        {
            var next = attempts.Min() + (long)Day.TotalSeconds;
            return (false, "daily upload limit reached", DateTimeOffset.FromUnixTimeSeconds(next));
        }
        return (true, "", null);
    }

    /// <summary>Call immediately before the POST. A failed attempt still counts.</summary>
    public void NoteAttempt(string door, DateTimeOffset now) => _s.Door(door).Attempts.Add(now.ToUnixTimeSeconds());

    public void NoteOk(string door) { var d = _s.Door(door); d.Strikes = 0; d.NotBeforeUnix = 0; }

    /// <summary>404: the server switch is off. Silent, and no sooner than six hours.</summary>
    public void NoteDoorOff(string door, DateTimeOffset now) =>
        _s.Door(door).NotBeforeUnix = (now + DoorOffWait).ToUnixTimeSeconds();

    /// <summary>429: back off 2 h, then 6 h, then 24 h for repeats.</summary>
    public void NoteRateLimited(string door, DateTimeOffset now)
    {
        var d = _s.Door(door);
        d.Strikes++;
        var wait = d.Strikes switch { 1 => TimeSpan.FromHours(2), 2 => TimeSpan.FromHours(6), _ => Day };
        d.NotBeforeUnix = (now + wait).ToUnixTimeSeconds();
    }

    /// <summary>Any other failure (timeout, 5xx, 400): one attempt, then an hour off.</summary>
    public void NoteFailure(string door, DateTimeOffset now) =>
        _s.Door(door).NotBeforeUnix = (now + FailureWait).ToUnixTimeSeconds();
}
