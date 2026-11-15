using TheWoWDB.Client.Sync;
using Xunit;

public class WireExtractorTests
{
    private const string Wire = "TWDBC1~H,1,forever,70790,16001~G,1731,1,500,600,h,3,2447:2,Peacebloom~V,5,6,100,1,~N,3,1,10,20,1,2,,v,1,Test Npc~Q,9,1,3,1,2,3,10,A Quest,5";

    [Fact]
    public void Extracts_the_wire_from_a_saved_variables_table()
    {
        var lua = "TheWoWDB_ForeverDB = {\n[\"collect\"] = {\n[\"wire\"] = \"" + Wire + "\",\n},\n}\n";
        Assert.Equal(Wire, WireExtractor.Extract(lua));
    }

    [Fact]
    public void Drops_the_movement_trail_and_nothing_else()
    {
        var wire = "TWDBC1~H,1,forever,70888,16001~K,500,8,1509:1~P,12,1436,560,85,1,2~Q,783,1,2~P,13,1436,561,85,1,2~N,515,1436,560,85,11,12,n,k,5,Murloc Raider";
        var kept = WireExtractor.WithoutTrail(wire);
        Assert.Equal("TWDBC1~H,1,forever,70888,16001~K,500,8,1509:1~Q,783,1,2~N,515,1436,560,85,11,12,n,k,5,Murloc Raider", kept);
        Assert.False(WireExtractor.CountRecords(kept).ContainsKey('P'));
    }

    [Fact]
    public void Decodes_lua_escapes()
    {
        var lua = "x = { w = \"TWDBC1~G,1\\\"q\\\"\\\\z~D,1\\n~V,\\65\" }";
        Assert.Equal("TWDBC1~G,1\"q\"\\z~D,1\n~V,A", WireExtractor.Extract(lua));
    }

    [Fact]
    public void Ignores_the_marker_when_it_is_not_a_string_start()
    {
        Assert.Null(WireExtractor.Extract("-- TWDBC1~ in a comment\nx = 1"));
        Assert.Null(WireExtractor.Extract("x = \"see TWDBC1~G\""));
    }

    [Fact]
    public void Unterminated_or_empty_input_is_null()
    {
        Assert.Null(WireExtractor.Extract(""));
        Assert.Null(WireExtractor.Extract("w = \"TWDBC1~G,1,2"));
        Assert.Null(WireExtractor.Extract("w = \"TWDBC1~G,1\nmore\""));
    }

    [Fact]
    public void Takes_the_first_real_wire_and_accepts_single_quotes()
    {
        var lua = "a = 'TWDBC1~H,1' b = \"TWDBC1~H,2\"";
        Assert.Equal("TWDBC1~H,1", WireExtractor.Extract(lua));
    }

    [Fact]
    public void Counts_records_by_first_letter()
    {
        var c = WireExtractor.CountRecords(Wire);
        Assert.Equal(1, c['H']);
        Assert.Equal(1, c['G']);
        Assert.Equal(1, c['Q']);
        Assert.Equal(5, c.Values.Sum());
    }
}
