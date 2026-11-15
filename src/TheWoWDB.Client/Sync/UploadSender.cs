using System.Text.Json;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Sync;

/// <summary>What the server said, or why there was no answer (Status 0).</summary>
public sealed record UploadResponse(int Status, string Body)
{
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(30);
}

/// <summary>The one network seam the uploaders use; <see cref="Downloader"/> is the real one.</summary>
public interface IUploadTransport
{
    Task<UploadResponse> PostAsync(string url, string body, string contentType, CancellationToken ct);
}

public enum SendKind
{
    /// <summary>Held back by the budget or a cool-down. Nothing was sent.</summary>
    Skipped,
    Ok,
    /// <summary>404: the server's switch is off. Silent.</summary>
    DoorOff,
    RateLimited,
    /// <summary>400/413: the server refused this content; do not send it again.</summary>
    Rejected,
    /// <summary>Timeout, 5xx, anything else. One attempt was made.</summary>
    Failed,
}

public sealed record SendResult(SendKind Kind, string Message, JsonElement? Json = null);

/// <summary>
/// One upload attempt with every guard in one place: budget, then a single POST,
/// then the status code turned into the right cool-down. Callers never retry.
/// </summary>
public sealed class UploadSender(UploadState state, IUploadTransport transport, Func<DateTimeOffset>? clock = null)
{
    private readonly UploadBudget _budget = new(state);
    private readonly Func<DateTimeOffset> _now = clock ?? (() => DateTimeOffset.UtcNow);

    public bool CanSend(string door) => _budget.Check(door, _now()).Allowed;

    public async Task<SendResult> SendAsync(string door, string url, string body, string contentType, CancellationToken ct)
    {
        var now = _now();
        var gate = _budget.Check(door, now);
        if (!gate.Allowed) return new SendResult(SendKind.Skipped, gate.Reason);

        _budget.NoteAttempt(now);
        var r = await transport.PostAsync(url, body, contentType, ct).ConfigureAwait(false);
        now = _now();

        if (r.Status == 200)
        {
            _budget.NoteOk(door);
            try
            {
                using var doc = JsonDocument.Parse(r.Body);
                var root = doc.RootElement.Clone();
                if (!(root.TryGetProperty("ok", out var ok) && ok.ValueKind == JsonValueKind.False))
                    return new SendResult(SendKind.Ok, "", root);
                return Reject(r);
            }
            catch (JsonException)
            {
                return new SendResult(SendKind.Ok, "");
            }
        }
        if (r.Status == 404)
        {
            _budget.NoteDoorOff(door, now);
            return new SendResult(SendKind.DoorOff, "");
        }
        if (r.Status == 429)
        {
            _budget.NoteRateLimited(door, now);
            return new SendResult(SendKind.RateLimited, "thewowdb.com asked us to slow down; trying again later");
        }
        if (r.Status is 400 or 413) { _budget.NoteFailure(door, now); return Reject(r); }

        _budget.NoteFailure(door, now);
        var why = r.Status == 0 ? r.Body : $"thewowdb.com answered {r.Status}";
        Log.Warn($"upload to {door} failed: {why}");
        return new SendResult(SendKind.Failed, why);
    }

    private static SendResult Reject(UploadResponse r)
    {
        var msg = "thewowdb.com did not accept it";
        try
        {
            using var doc = JsonDocument.Parse(r.Body);
            if (doc.RootElement.TryGetProperty("error", out var e) && e.ValueKind == JsonValueKind.String)
                msg = "thewowdb.com did not accept it: " + Trim(e.GetString()!);
        }
        catch (JsonException) { /* a non-JSON error page: keep the plain sentence */ }
        return new SendResult(SendKind.Rejected, msg);
    }

    private static string Trim(string s) => s.Length <= 120 ? s : s[..119] + "...";
}
