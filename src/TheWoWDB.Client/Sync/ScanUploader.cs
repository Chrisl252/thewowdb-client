using System.Text;
using System.Text.Json;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// Uploads completed Forever auction-house scans to POST /api/addon/scan.
///
/// The addon keeps finished scans as `export.snapshots` (a ring of up to 20) in
/// the same SavedVariables file: `{realm, faction, region, flavour, build, t,
/// label, n, items = {[itemId] = {l = lowest copper, q = quantity, c = listings}}}`.
/// The server wants NDJSON, one object per snapshot: `{realm, region, build,
/// flavour, scanned_at (ISO-8601), items: [{item_id, lowest_copper}]}`
/// (addon_upload_intake.assess). This class is that mapping and nothing else.
///
/// Only the newest unsent snapshot per realm and faction is sent (the server
/// replaces a realm's prices with the latest scan, so older ones add nothing).
/// Anonymous: no token, no account, no character name.
/// </summary>
public sealed class ScanUploader(UploadState state, UploadSender sender)
{
    public const string Door = "scan";

    /// <summary>The server's anonymous cap is 4 MB; stay well under it.</summary>
    public const int MaxBodyBytes = 3_500_000;
    private static readonly TimeSpan MaxAge = TimeSpan.FromDays(29);   // server quarantines past 30
    private const int MaxRememberedIds = 200;

    public sealed record Snapshot(string Id, string Group, string Json);

    /// <summary>Pure: the sendable snapshots in a SavedVariables text, newest per realm+faction, not yet sent.</summary>
    public static List<Snapshot> BuildSnapshots(string luaText, ICollection<string> alreadySent, DateTimeOffset now,
                                                out List<string> superseded)
    {
        superseded = new List<string>();
        var result = new List<Snapshot>();
        var export = LuaTable.ReadAfterKey(luaText, "export");
        if (export is null || LuaTable.Get(export, "snapshots") is not Dictionary<object, object?> snaps) return result;

        var byGroup = new Dictionary<string, (double T, Snapshot Snap)>();
        foreach (var raw in snaps.Values)
        {
            if (raw is not Dictionary<object, object?> s) continue;
            var realm = LuaTable.Get(s, "realm") as string;
            var region = LuaTable.Get(s, "region") as string;
            var build = LuaTable.Get(s, "build") as string;
            var flavour = (LuaTable.Get(s, "flavour") as string)?.ToLowerInvariant();
            var t = LuaTable.Get(s, "t") as double?;
            if (flavour != "forever" || string.IsNullOrWhiteSpace(realm) || string.IsNullOrWhiteSpace(region)
                || string.IsNullOrWhiteSpace(build) || t is null || LuaTable.Get(s, "items") is not Dictionary<object, object?> items)
                continue;

            var when = DateTimeOffset.FromUnixTimeSeconds((long)t.Value);
            if (now - when > MaxAge || when - now > TimeSpan.FromHours(1)) continue;

            var id = $"{realm}|{(long)t.Value}";

            var faction = LuaTable.Get(s, "faction") as string ?? "";
            var group = realm + "|" + faction;
            if (byGroup.TryGetValue(group, out var prev))
            {
                if (prev.T >= t.Value) { superseded.Add(id); continue; }
                superseded.Add(prev.Snap.Id);
            }
            byGroup[group] = (t.Value, new Snapshot(id, group, ToJson(realm!, faction, region!, build!, when, LuaTable.Get(s, "label") as string, items)));
        }
        // The newest of each group decides: if it was already sent, the group is done.
        foreach (var (_, snap) in byGroup.Values)
        {
            if (alreadySent.Contains(snap.Id)) superseded.Add(snap.Id);
            else result.Add(snap);
        }
        return result;
    }

    private static string ToJson(string realm, string faction, string region, string build, DateTimeOffset when,
                                 string? label, Dictionary<object, object?> items)
    {
        using var ms = new MemoryStream();
        using (var w = new Utf8JsonWriter(ms))
        {
            w.WriteStartObject();
            w.WriteString("realm", realm);
            w.WriteString("faction", faction);
            w.WriteString("region", region);
            w.WriteString("flavour", "forever");
            w.WriteString("build", build);
            w.WriteString("scanned_at", when.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"));
            if (label is not null) w.WriteString("label", label);
            w.WriteStartArray("items");
            foreach (var (k, v) in items)
            {
                if (k is not double id || v is not Dictionary<object, object?> it) continue;
                if (LuaTable.Get(it, "l") is not double low || low <= 0) continue;
                w.WriteStartObject();
                w.WriteNumber("item_id", (long)id);
                w.WriteNumber("lowest_copper", (long)low);
                if (LuaTable.Get(it, "q") is double q) w.WriteNumber("quantity", (long)q);
                if (LuaTable.Get(it, "c") is double c) w.WriteNumber("listings", (long)c);
                w.WriteEndObject();
            }
            w.WriteEndArray();
            w.WriteEndObject();
        }
        return Encoding.UTF8.GetString(ms.ToArray());
    }

    public async Task<string?> RunFileAsync(string path, string luaText, CancellationToken ct)
    {
        var f = state.File(path + "#scan");
        var snaps = BuildSnapshots(luaText, f.ScanIds, DateTimeOffset.UtcNow, out var superseded);
        foreach (var id in superseded) Remember(f, id);
        if (snaps.Count == 0) return null;

        // NDJSON, newest realms first, as many as fit under the body cap.
        var body = new StringBuilder();
        var sent = new List<Snapshot>();
        foreach (var s in snaps)
        {
            if (sent.Count > 0 && body.Length + s.Json.Length > MaxBodyBytes) break;
            body.Append(s.Json).Append('\n');
            sent.Add(s);
        }

        var r = await sender.SendAsync(Door, AppInfo.ScanUploadUrl, body.ToString(), "application/x-ndjson", ct).ConfigureAwait(false);
        string? line = null;
        switch (r.Kind)
        {
            case SendKind.Ok:
                foreach (var s in sent) Remember(f, s.Id);
                var accepted = r.Json is { } j && j.TryGetProperty("accepted", out var a) && a.ValueKind == JsonValueKind.True;
                var items = r.Json is { } j2 && j2.TryGetProperty("items", out var n) && n.TryGetInt32(out var c) ? c : -1;
                line = accepted
                    ? (items >= 0 ? $"auction scan sent, {items:N0} prices accepted" : "auction scan sent")
                    : "auction scan kept for review, not published yet" + FirstReason(r.Json);
                f.Ok = accepted;
                break;
            case SendKind.Rejected:
                foreach (var s in sent) Remember(f, s.Id);       // content problem: never re-send these
                line = "auction scan: " + r.Message;
                f.Ok = false;
                break;
            case SendKind.RateLimited:
            case SendKind.Failed:
                line = "auction scan: " + r.Message;
                f.Ok = false;
                break;
            default:
                return null;                                      // Skipped / DoorOff
        }
        f.AtUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        f.Message = line;
        return line;
    }

    private static string FirstReason(JsonElement? json)
    {
        if (json is { } j && j.TryGetProperty("reasons", out var rs) && rs.ValueKind == JsonValueKind.Array
            && rs.GetArrayLength() > 0 && rs[0].ValueKind == JsonValueKind.String)
        {
            var t = rs[0].GetString() ?? "";
            return " (" + (t.Length <= 100 ? t : t[..99] + "...") + ")";
        }
        return "";
    }

    private static void Remember(FileUpload f, string id)
    {
        if (!f.ScanIds.Contains(id)) f.ScanIds.Add(id);
        while (f.ScanIds.Count > MaxRememberedIds) f.ScanIds.RemoveAt(0);
    }
}
