using System.Diagnostics;
using System.IO.Compression;
using System.Security.Cryptography;
using TheWoWDB.Client.Core;
using TheWoWDB.Client.Sync;
using TheWoWDB.Client.Wow;
using Xunit;

/// <summary>Install tests run in a temp folder, never in a real game folder.</summary>
public class ForeverInstallTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "twdb-forever-" + Guid.NewGuid().ToString("n"));
    private readonly WowFlavor _flavor;

    public ForeverInstallTests()
    {
        Directory.CreateDirectory(Path.Combine(_root, "_forever_", "Interface"));
        _flavor = new WowFlavor("_forever_", Path.Combine(_root, "_forever_"));
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp */ }
    }

    private string MakeZip(string version)
    {
        var zip = Path.Combine(_root, $"fwd-{version}.zip");
        using (var z = ZipFile.Open(zip, ZipArchiveMode.Create))
        {
            void Add(string name, string text)
            {
                using var w = new StreamWriter(z.CreateEntry(name).Open());
                w.Write(text);
            }
            Add("TheWoWDB_Forever/TheWoWDB_Forever.toc", $"## Interface: 16001\n## Version: {version}\nmain.lua\n");
            Add("TheWoWDB_Forever/main.lua", "-- test\n");
        }
        return zip;
    }

    [Fact]
    public void Flavor_names_and_game_rules()
    {
        Assert.Equal("WoW Forever", new WowFlavor("_forever_", "x").DisplayName);
        Assert.Equal("Classic Anniversary", new WowFlavor("_anniversary_", "x").DisplayName);
        Assert.True(new WowFlavor("_forever_", "x").IsForever);
        Assert.False(new WowFlavor("_forever_", "x").RunsRetail);
        Assert.False(new WowFlavor("_classic_beta_", "x").IsForever);
    }

    [Fact]
    public void Scanner_finds_the_forever_and_anniversary_folders()
    {
        Directory.CreateDirectory(Path.Combine(_root, "_anniversary_", "Interface"));
        var names = WowInstallScanner.FlavorsIn(_root).Select(f => f.Name).ToList();
        Assert.Contains("_forever_", names);
        Assert.Contains("_anniversary_", names);
    }

    [Fact]
    public void Installs_and_then_updates_the_forever_folder()
    {
        AddonFolder.InstallFromZip(MakeZip("1.0.0"), _flavor, AddonFolder.ForeverAddonName);
        var path = AddonFolder.PathIn(_flavor, AddonFolder.ForeverAddonName);
        Assert.Equal("1.0.0", AddonFolder.InstalledVersion(path, AddonFolder.ForeverAddonName));
        Assert.True(File.Exists(Path.Combine(path, "main.lua")));

        AddonFolder.InstallFromZip(MakeZip("1.1.0"), _flavor, AddonFolder.ForeverAddonName);
        Assert.Equal("1.1.0", AddonFolder.InstalledVersion(path, AddonFolder.ForeverAddonName));
        Assert.False(Directory.Exists(path + ".previous"));
    }

    [Fact]
    public void A_zip_for_another_addon_is_refused_and_nothing_changes()
    {
        var zip = Path.Combine(_root, "wrong.zip");
        using (var z = ZipFile.Open(zip, ZipArchiveMode.Create))
            using (var w = new StreamWriter(z.CreateEntry("Other/Other.toc").Open())) w.Write("x");
        Assert.Throws<InvalidDataException>(() => AddonFolder.InstallFromZip(zip, _flavor, AddonFolder.ForeverAddonName));
        Assert.False(Directory.Exists(AddonFolder.PathIn(_flavor, AddonFolder.ForeverAddonName)));
    }

    [Fact]
    public void A_junctioned_forever_folder_is_never_touched()
    {
        var source = Path.Combine(_root, "source-checkout");
        Directory.CreateDirectory(source);
        File.WriteAllText(Path.Combine(source, "mine.lua"), "uncommitted");
        var addons = _flavor.AddOnsDir;
        Directory.CreateDirectory(addons);
        var link = AddonFolder.PathIn(_flavor, AddonFolder.ForeverAddonName);
        var p = Process.Start(new ProcessStartInfo("cmd.exe", $"/c mklink /J \"{link}\" \"{source}\"")
        { CreateNoWindow = true, UseShellExecute = false, RedirectStandardOutput = true })!;
        p.WaitForExit(10000);
        Assert.True(AddonFolder.IsDeveloperLink(link));

        Assert.Throws<DeveloperLinkException>(() =>
            AddonFolder.InstallFromZip(MakeZip("9.9.9"), _flavor, AddonFolder.ForeverAddonName));
        Assert.True(File.Exists(Path.Combine(source, "mine.lua")));
        Assert.Equal("uncommitted", File.ReadAllText(Path.Combine(source, "mine.lua")));
    }

    [Fact]
    public async Task Without_manifest_fields_nothing_is_installed_and_the_row_says_so()
    {
        using var net = new Downloader("test");
        using var inst = new ForeverAddonInstaller(new Settings(), new Manifest(), net);
        var r = await inst.RunAsync(_flavor, default);
        Assert.Equal(FlavorOutcome.NoForeverAddon, r.Outcome);
        Assert.Equal("Forever addon not published yet", r.Detail);
        Assert.False(Directory.Exists(AddonFolder.PathIn(_flavor, AddonFolder.ForeverAddonName)));
    }

    [Fact]
    public async Task A_junction_wins_even_when_the_manifest_has_the_addon()
    {
        var source = Path.Combine(_root, "src2");
        Directory.CreateDirectory(source);
        Directory.CreateDirectory(_flavor.AddOnsDir);
        var link = AddonFolder.PathIn(_flavor, AddonFolder.ForeverAddonName);
        Process.Start(new ProcessStartInfo("cmd.exe", $"/c mklink /J \"{link}\" \"{source}\"")
        { CreateNoWindow = true, UseShellExecute = false })!.WaitForExit(10000);

        var m = new Manifest { ForeverAddon = new Manifest.AddonEntry { Version = "2.0.0", Url = "http://127.0.0.1:1/x.zip" } };
        using var net = new Downloader("test");
        using var inst = new ForeverAddonInstaller(new Settings(), m, net);
        var r = await inst.RunAsync(_flavor, default);
        Assert.Equal(FlavorOutcome.SkippedDeveloperLink, r.Outcome);
    }

    [Fact]
    public void Manifest_json_keys_parse()
    {
        var json = "{\"schema\":1,\"foreverAddon\":{\"version\":\"1.2.3\",\"url\":\"https://x/y.zip\",\"sha256\":\"ab\"},\"collectUpload\":true,\"scanUpload\":false}";
        var m = System.Text.Json.JsonSerializer.Deserialize<Manifest>(json)!;
        Assert.Equal("1.2.3", m.ForeverAddon!.Version);
        Assert.True(m.CollectUpload);
        Assert.False(m.ScanUpload);
        Assert.False(System.Text.Json.JsonSerializer.Deserialize<Manifest>("{}")!.CollectUpload);
    }
}
