using TheWoWDB.Client.Sync;
using Xunit;

public class CollectUploaderTests
{
    private sealed class FakeTransport(params UploadResponse[] answers) : IUploadTransport
    {
        private readonly Queue<UploadResponse> _q = new(answers);
        public List<(string Url, string Body)> Calls { get; } = new();
        public Task<UploadResponse> PostAsync(string url, string body, string contentType, CancellationToken ct)
        {
            Calls.Add((url, body));
            return Task.FromResult(_q.Count > 0 ? _q.Dequeue() : new UploadResponse(500, ""));
        }
    }

    private static string Lua(string wire) => "DB = {\n[\"w\"] = \"" + wire + "\",\n}\n";
    private static readonly DateTimeOffset T0 = new(2026, 11, 15, 12, 0, 0, TimeSpan.Zero);

    private sealed class Clock { public DateTimeOffset Now = T0; }

    private static (CollectUploader U, UploadState S, FakeTransport T, Clock C) Make(params UploadResponse[] answers)
    {
        var s = new UploadState();
        var t = new FakeTransport(answers);
        var c = new Clock();
        var sender = new UploadSender(s, t, () => c.Now);
        return (new CollectUploader(s, sender, "1.1.0"), s, t, c);
    }

    private const string Ok = "{\"ok\":true,\"records\":42,\"dropped\":1}";
    private const string F = @"C:\wow\a.lua";

    [Fact]
    public async Task Sends_once_and_skips_an_unchanged_file_by_hash()
    {
        var (u, s, t, c) = Make(new UploadResponse(200, Ok), new UploadResponse(200, Ok));
        var line = await u.RunFileAsync(F, Lua("TWDBC1~H,1~G,1"), default);
        Assert.Equal("42 records accepted (1 skipped)", line);
        Assert.Single(t.Calls);
        Assert.Contains("\"wire\":\"TWDBC1~H,1~G,1\"", t.Calls[0].Body);
        Assert.Contains("\"client\":\"1.1.0\"", t.Calls[0].Body);

        c.Now = T0.AddHours(1);
        Assert.Null(await u.RunFileAsync(F, Lua("TWDBC1~H,1~G,1"), default));
        Assert.Single(t.Calls);                                   // same hash: no second POST
        Assert.True(s.Peek(F)!.Ok);

        c.Now = T0.AddHours(2);
        await u.RunFileAsync(F, Lua("TWDBC1~H,1~G,1~G,2"), default);
        Assert.Equal(2, t.Calls.Count);                           // changed content sends again
    }

    [Fact]
    public async Task Changed_content_inside_twenty_minutes_waits()
    {
        var (u, _, t, c) = Make(new UploadResponse(200, Ok), new UploadResponse(200, Ok));
        await u.RunFileAsync(F, Lua("TWDBC1~H,1"), default);
        c.Now = T0.AddMinutes(10);
        Assert.Null(await u.RunFileAsync(F, Lua("TWDBC1~H,1~G,1"), default));
        Assert.Single(t.Calls);
    }

    [Fact]
    public async Task Door_off_is_silent_and_not_retried_for_six_hours()
    {
        var (u, s, t, c) = Make(new UploadResponse(404, "<html>"));
        Assert.Null(await u.RunFileAsync(F, Lua("TWDBC1~H,1"), default));
        c.Now = T0.AddHours(3);
        Assert.Null(await u.RunFileAsync(F, Lua("TWDBC1~H,1"), default));
        Assert.Single(t.Calls);
        Assert.Null(s.Peek(F)?.Message);
    }

    [Fact]
    public async Task Rate_limit_gives_a_plain_line_and_backs_off()
    {
        var (u, _, t, c) = Make(new UploadResponse(429, "{\"ok\":false,\"error\":\"too many\"}"));
        var line = await u.RunFileAsync(F, Lua("TWDBC1~H,1"), default);
        Assert.Contains("slow down", line);
        c.Now = T0.AddMinutes(30);
        Assert.Null(await u.RunFileAsync(F, Lua("TWDBC1~H,1"), default));
        Assert.Single(t.Calls);
    }

    [Fact]
    public async Task A_refused_wire_is_never_sent_again()
    {
        var (u, _, t, c) = Make(new UploadResponse(400, "{\"ok\":false,\"error\":\"bad record\"}"));
        var line = await u.RunFileAsync(F, Lua("TWDBC1~H,1"), default);
        Assert.Contains("bad record", line);
        c.Now = T0.AddDays(2);
        Assert.Null(await u.RunFileAsync(F, Lua("TWDBC1~H,1"), default));
        Assert.Single(t.Calls);
    }

    [Fact]
    public async Task No_wire_means_no_request()
    {
        var (u, _, t, _) = Make();
        Assert.Null(await u.RunFileAsync(F, "DB = { x = 1 }", default));
        Assert.Empty(t.Calls);
    }

    [Fact]
    public async Task A_timeout_is_one_attempt_with_a_plain_error()
    {
        var (u, _, t, _) = Make(new UploadResponse(0, "thewowdb.com did not answer in 30 seconds"));
        var line = await u.RunFileAsync(F, Lua("TWDBC1~H,1"), default);
        Assert.Contains("did not answer", line);
        Assert.Single(t.Calls);
    }
}
