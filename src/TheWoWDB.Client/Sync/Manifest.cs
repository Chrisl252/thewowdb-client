using System.Text.Json.Serialization;

namespace TheWoWDB.Client.Sync;

/// <summary>
/// The one document the client reads to learn what it should be installing.
/// Keeping it server-side means the delivery layout can change (new host, new
/// file names, a moved addon repo) without shipping a new executable.
/// </summary>
public sealed class Manifest
{
    [JsonPropertyName("schema")] public int Schema { get; set; } = 1;
    [JsonPropertyName("addon")] public AddonEntry? Addon { get; set; }
    [JsonPropertyName("data")] public DataEntry? Data { get; set; }
    [JsonPropertyName("client")] public ClientEntry? Client { get; set; }
    [JsonPropertyName("message")] public string? Message { get; set; }

    public sealed class AddonEntry
    {
        [JsonPropertyName("version")] public string Version { get; set; } = "";
        [JsonPropertyName("url")] public string Url { get; set; } = "";
        [JsonPropertyName("sha256")] public string? Sha256 { get; set; }
    }

    public sealed class DataEntry
    {
        /// <summary>Datestamp of the export, e.g. 20260814. Compared to decide staleness.</summary>
        [JsonPropertyName("build")] public long Build { get; set; }
        [JsonPropertyName("generated")] public long Generated { get; set; }
        [JsonPropertyName("url")] public string Url { get; set; } = "";
        [JsonPropertyName("sha256")] public string? Sha256 { get; set; }
        /// <summary>Where the file goes inside the addon folder.</summary>
        [JsonPropertyName("target")] public string Target { get; set; } = "data/MarketData.lua";
        /// <summary>True when the URL serves gzip that we have to inflate ourselves.</summary>
        [JsonPropertyName("gzip")] public bool Gzip { get; set; } = true;
    }

    public sealed class ClientEntry
    {
        [JsonPropertyName("version")] public string Version { get; set; } = "";
        [JsonPropertyName("url")] public string? Url { get; set; }
        [JsonPropertyName("notes")] public string? Notes { get; set; }
    }
}
