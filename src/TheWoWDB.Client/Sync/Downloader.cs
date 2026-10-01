using System.IO.Compression;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Sync;

/// <summary>All network access. Nothing else in the client owns an HttpClient.</summary>
public sealed class Downloader : IDisposable
{
    /// <summary>
    /// A fixed release tag, so the URL never changes: publishing a new manifest
    /// clobbers this one asset. Anything else (addon zip, data file, client exe)
    /// is addressed by whatever URL the manifest hands back.
    /// </summary>
    public const string DefaultManifestUrl =
        "https://github.com/Chrisl252/thewowdb-client/releases/download/live/manifest.json";

    private readonly HttpClient _http;

    public Downloader(string userAgent)
    {
        _http = new HttpClient(new SocketsHttpHandler
        {
            AutomaticDecompression = System.Net.DecompressionMethods.All,
            ConnectTimeout = TimeSpan.FromSeconds(20),
        })
        {
            Timeout = TimeSpan.FromMinutes(10),
        };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd(userAgent);
        _http.DefaultRequestHeaders.CacheControl = new CacheControlHeaderValue { NoCache = true };
    }

    public async Task<Manifest> GetManifestAsync(string url, CancellationToken ct)
    {
        // The manifest sits behind a CDN at a URL that never changes, so a
        // cache-buster is the difference between "new data daily" and "new data
        // whenever the edge feels like it".
        var bust = url + (url.Contains('?') ? "&" : "?") + "t=" + DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var json = await _http.GetStringAsync(bust, ct).ConfigureAwait(false);

        // Strip a UTF-8 BOM before parsing. System.Text.Json treats a leading
        // U+FEFF as "invalid start of a value", so a manifest written by any of
        // the several Windows tools that emit a BOM by default would download
        // fine, return 200, and then fail for every user at once.
        return JsonSerializer.Deserialize<Manifest>(json.TrimStart('﻿'))
               ?? throw new InvalidDataException("the manifest was empty");
    }

    /// <summary>Download to a temp file and verify the hash before anyone uses it.</summary>
    public async Task<string> DownloadToTempAsync(string url, string? expectedSha256, CancellationToken ct)
    {
        AppPaths.EnsureCreated();
        var tmp = Path.Combine(AppPaths.CacheDir, Guid.NewGuid().ToString("n") + ".part");

        using (var response = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct)
                                         .ConfigureAwait(false))
        {
            response.EnsureSuccessStatusCode();
            await using var src = await response.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            await using var dst = File.Create(tmp);
            await src.CopyToAsync(dst, ct).ConfigureAwait(false);
        }

        if (!string.IsNullOrWhiteSpace(expectedSha256))
        {
            var actual = Sha256File(tmp);
            if (!actual.Equals(expectedSha256.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(tmp);
                throw new InvalidDataException(
                    $"checksum mismatch for {url} (expected {expectedSha256}, got {actual})");
            }
        }

        return tmp;
    }

    public static byte[] ReadMaybeGzip(string path, bool gzip)
    {
        if (!gzip) return File.ReadAllBytes(path);
        using var file = File.OpenRead(path);
        using var gz = new GZipStream(file, CompressionMode.Decompress);
        using var buffer = new MemoryStream();
        gz.CopyTo(buffer);
        return buffer.ToArray();
    }

    /// <summary>
    /// Multipart POST of small local files (the WoW Forever WDB caches). Returns
    /// the status code and the first 2 KB of the body for the log. A refusal is a
    /// status, not an exception: an upload is a courtesy and never fails a sync.
    /// </summary>
    public async Task<(int Status, string Body)> PostFilesAsync(
        string url, IReadOnlyDictionary<string, byte[]> files,
        IReadOnlyDictionary<string, string> fields, CancellationToken ct)
    {
        using var form = new MultipartFormDataContent();
        foreach (var (name, value) in fields)
            form.Add(new StringContent(value), name);
        foreach (var (name, bytes) in files)
        {
            var part = new ByteArrayContent(bytes);
            part.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
            form.Add(part, name, name + ".wdb");
        }
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(60));
        using var response = await _http.PostAsync(url, form, cts.Token).ConfigureAwait(false);
        var body = await response.Content.ReadAsStringAsync(cts.Token).ConfigureAwait(false);
        return ((int)response.StatusCode, body.Length > 2048 ? body[..2048] : body);
    }

    private static string Sha256File(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }

    public void Dispose() => _http.Dispose();
}
