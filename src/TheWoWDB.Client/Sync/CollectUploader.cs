using System.Text.Json;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// Uploads what the Forever addon collected (drops, vendors, nodes, quest givers).
/// Opt-in twice over: the manifest flag AND the player's checkbox; the caller
/// checks both before calling. One file, one attempt, skip when the content
/// is the same as the last accepted upload.
/// </summary>
public sealed class CollectUploader(UploadState state, UploadSender sender, string clientVersion)
{
    public const string Door = "collect";

    /// <summary>Returns the line to show, or null when nothing changed (nothing to say).</summary>
    public async Task<string?> RunFileAsync(string path, string luaText, CancellationToken ct)
    {
        var wire = WireExtractor.Extract(luaText);
        if (wire is null) return null;                       // the addon has collected nothing yet

        var hash = UploadState.Sha256Hex(wire);
        var f = state.File(path);
        if (hash == f.Hash || hash == f.RejectedHash) return null;   // already sent, or refused for its content

        if (wire.Length > WireExtractor.MaxWireChars)
            return Record(f, hash, SendKind.Rejected, "too much collected data to send in one go", rejected: true);

        var body = JsonSerializer.Serialize(new { wire, client = clientVersion });
        var r = await sender.SendAsync(Door, AppInfo.CollectUploadUrl, body, "application/json", ct).ConfigureAwait(false);

        switch (r.Kind)
        {
            case SendKind.Ok:
                var records = r.Json is { } j && j.TryGetProperty("records", out var n) && n.TryGetInt32(out var c) ? c : -1;
                var dropped = r.Json is { } j2 && j2.TryGetProperty("dropped", out var d) && d.TryGetInt32(out var dc) ? dc : 0;
                var text = records >= 0
                    ? $"{records:N0} records accepted" + (dropped > 0 ? $" ({dropped:N0} skipped)" : "")
                    : "uploaded";
                f.Hash = hash;
                return Record(f, hash, SendKind.Ok, text);
            case SendKind.Rejected:
                return Record(f, hash, SendKind.Rejected, r.Message, rejected: true);
            case SendKind.RateLimited:
            case SendKind.Failed:
                return Record(f, hash, r.Kind, r.Message);
            default:                                          // Skipped / DoorOff: silent, state already set
                return null;
        }
    }

    private static string Record(FileUpload f, string hash, SendKind kind, string message, bool rejected = false)
    {
        f.AtUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        f.Ok = kind == SendKind.Ok;
        f.Message = message;
        if (rejected) f.RejectedHash = hash;
        return message;
    }
}
