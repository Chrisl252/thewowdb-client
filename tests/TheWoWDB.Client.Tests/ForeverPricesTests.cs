using System.Text;
using TheWoWDB.Client.Sync;
using Xunit;

namespace TheWoWDB.Client.Tests;

public class ForeverPricesTests
{
    private static byte[] Table(long generated, int pad = 60_000) => Encoding.UTF8.GetBytes(
        "-- header\nlocal ADDON_NAME, WGF = ...\nWGF.ForeverRealmPrices = {\nversion = 2,\ngenerated = " + generated +
        ",\nregion = \"US\",\n" + new string('x', pad));

    [Fact]
    public void Reads_the_generated_stamp() =>
        Assert.Equal(1794782620, ForeverPrices.GeneratedOf("generated = 1794782620,"));

    [Fact]
    public void The_stub_and_an_error_page_are_not_valid()
    {
        Assert.True(ForeverPrices.LooksValid(Table(1794782620)));
        Assert.False(ForeverPrices.LooksValid(Table(0)));                     // the shipped stub says generated = 0
        Assert.False(ForeverPrices.LooksValid(Table(1794782620, pad: 100)));  // far too small
        Assert.False(ForeverPrices.LooksValid(Encoding.UTF8.GetBytes("<html>" + new string('x', 60_000))));
    }

    [Fact]
    public void Region_comes_from_config_wtf_and_defaults_to_us()
    {
        var dir = Path.Combine(Path.GetTempPath(), "twdb-fp-" + Guid.NewGuid().ToString("n"));
        Directory.CreateDirectory(Path.Combine(dir, "WTF"));
        try
        {
            Assert.Equal("us", ForeverPrices.Region(dir));
            File.WriteAllText(Path.Combine(dir, "WTF", "Config.wtf"), "SET gxApi \"D3D12\"\nSET portal \"EU\"\n");
            Assert.Equal("eu", ForeverPrices.Region(dir));
        }
        finally { Directory.Delete(dir, true); }
    }

    [Fact]
    public void A_file_under_fifty_minutes_old_is_fresh()
    {
        var dir = Path.Combine(Path.GetTempPath(), "twdb-fp-" + Guid.NewGuid().ToString("n"));
        Directory.CreateDirectory(Path.Combine(dir, "data"));
        try
        {
            var now = DateTimeOffset.FromUnixTimeSeconds(1794782620);
            Assert.False(ForeverPrices.IsFresh(dir, now));
            File.WriteAllBytes(Path.Combine(dir, "data", "ForeverRealmPrices.lua"), Table(1794782620 - 600));
            Assert.True(ForeverPrices.IsFresh(dir, now));
            Assert.False(ForeverPrices.IsFresh(dir, now.AddHours(1)));
        }
        finally { Directory.Delete(dir, true); }
    }
}
