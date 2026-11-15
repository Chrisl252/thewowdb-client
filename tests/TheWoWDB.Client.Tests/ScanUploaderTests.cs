using TheWoWDB.Client.Sync;
using Xunit;

public class ScanUploaderTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeSeconds(1_793_850_000);

    private const string Lua = @"DB = {
[""export""] = {
[""version""] = 1,
[""snapshots""] = {
{
[""region""] = ""US"", [""t""] = 1793845975, [""realm""] = ""Test Realm"", [""faction""] = ""Horde"",
[""flavour""] = ""forever"", [""build""] = ""1.60.1|70790|16001|18"", [""label""] = ""Full scan"", [""n""] = 2,
[""items""] = { [2840] = { [""q""] = 501, [""l""] = 100, [""c""] = 1 }, [255007] = { [""q""] = 4, [""l""] = 0, [""c""] = 1 }, },
},
{
[""region""] = ""US"", [""t""] = 1793847204, [""realm""] = ""Test Realm"", [""faction""] = ""Horde"",
[""flavour""] = ""forever"", [""build""] = ""1.60.1|70790|16001|18"", [""n""] = 1,
[""items""] = { [6348] = { [""q""] = 1, [""l""] = 10000, [""c""] = 1 }, },
},
{
[""region""] = ""US"", [""t""] = 1793847300, [""realm""] = ""Retail Realm"", [""faction""] = ""Horde"",
[""flavour""] = ""retail"", [""build""] = ""x|1|2|1"",
[""items""] = { [1] = { [""l""] = 5 } },
},
},
},
}";

    [Fact]
    public void Keeps_only_the_newest_forever_snapshot_per_realm_and_maps_the_server_shape()
    {
        var snaps = ScanUploader.BuildSnapshots(Lua, new List<string>(), Now, out var superseded);
        var s = Assert.Single(snaps);
        Assert.Equal("Test Realm|1793847204", s.Id);
        Assert.Equal(new[] { "Test Realm|1793845975" }, superseded);
        using var doc = System.Text.Json.JsonDocument.Parse(s.Json);
        var root = doc.RootElement;
        Assert.Equal("Test Realm", root.GetProperty("realm").GetString());
        Assert.Equal("US", root.GetProperty("region").GetString());
        Assert.Equal("1.60.1|70790|16001|18", root.GetProperty("build").GetString());
        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1793847204).UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                     root.GetProperty("scanned_at").GetString());
        var item = Assert.Single(root.GetProperty("items").EnumerateArray());
        Assert.Equal(6348, item.GetProperty("item_id").GetInt64());
        Assert.Equal(10000, item.GetProperty("lowest_copper").GetInt64());
    }

    [Fact]
    public void Already_sent_snapshots_are_not_built_again()
    {
        var snaps = ScanUploader.BuildSnapshots(Lua, new List<string> { "Test Realm|1793847204" }, Now, out _);
        Assert.Empty(snaps);
    }

    [Fact]
    public void Old_scans_are_dropped()
    {
        var snaps = ScanUploader.BuildSnapshots(Lua, new List<string>(), Now.AddDays(40), out _);
        Assert.Empty(snaps);
    }

    [Fact]
    public void Lua_reader_handles_names_numbers_and_comments()
    {
        var t = LuaTable.ReadAfterKey("x = { a = 1, -- note\n [\"b\"] = { 7, 8 }, c = true }", "x")!;
        Assert.Equal(1.0, t["a"]);
        Assert.Equal(true, t["c"]);
        var b = Assert.IsType<Dictionary<object, object?>>(t["b"]);
        Assert.Equal(8.0, b[2.0]);
    }
}
