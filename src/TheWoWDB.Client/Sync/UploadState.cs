using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Sync;

/// <summary>What the last upload of one file did. Persisted, so a restart does not re-send.</summary>
public sealed class FileUpload
{
    /// <summary>SHA-256 of the wire the server last ACCEPTED.</summary>
    public string? Hash { get; set; }
    /// <summary>SHA-256 of a wire the server refused for its content (400/413); never re-sent.</summary>
    public string? RejectedHash { get; set; }
    public long AtUnix { get; set; }
    /// <summary>The line the window shows: "N records accepted" or a plain error.</summary>
    public string? Message { get; set; }
    public bool Ok { get; set; }
    /// <summary>Ids (realm|time) of auction snapshots already sent from this file.</summary>
    public List<string> ScanIds { get; set; } = new();
}

public sealed class DoorState
{
    /// <summary>No attempt before this time (unix seconds): door off, rate limited, or cooling down.</summary>
    public long NotBeforeUnix { get; set; }
    public int Strikes { get; set; }
}

/// <summary>Everything the uploaders remember between runs: budget, per-file hashes, door cool-downs.</summary>
public sealed class UploadState
{
    /// <summary>Unix seconds of every POST attempt in the last 24 h (the shared budget).</summary>
    public List<long> Attempts { get; set; } = new();
    public Dictionary<string, FileUpload> Files { get; set; } = new();
    public Dictionary<string, DoorState> Doors { get; set; } = new();

    /// <summary>The manifest's switches as last seen, so a file-change trigger between syncs knows the rules.</summary>
    public bool CollectAllowed { get; set; }
    public bool ScanAllowed { get; set; }

    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };

    public static string Sha256Hex(string text) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text))).ToLowerInvariant();

    public FileUpload File(string key)
    {
        key = key.ToLowerInvariant();
        if (!Files.TryGetValue(key, out var f)) Files[key] = f = new FileUpload();
        return f;
    }

    public FileUpload? Peek(string key) => Files.GetValueOrDefault(key.ToLowerInvariant());

    public DoorState Door(string name)
    {
        if (!Doors.TryGetValue(name, out var d)) Doors[name] = d = new DoorState();
        return d;
    }

    public static UploadState Load(string? path = null)
    {
        path ??= AppPaths.UploadStateFile;
        try
        {
            if (System.IO.File.Exists(path))
                return JsonSerializer.Deserialize<UploadState>(System.IO.File.ReadAllText(path), Options)
                       ?? new UploadState();
        }
        catch (Exception ex) { Log.Warn($"upload state unreadable, starting fresh: {ex.Message}"); }
        return new UploadState();
    }

    public void Save(string? path = null)
    {
        path ??= AppPaths.UploadStateFile;
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var tmp = path + ".tmp";
            System.IO.File.WriteAllText(tmp, JsonSerializer.Serialize(this, Options));
            System.IO.File.Move(tmp, path, overwrite: true);
        }
        catch (Exception ex) { Log.Error("could not save upload state", ex); }
    }
}
