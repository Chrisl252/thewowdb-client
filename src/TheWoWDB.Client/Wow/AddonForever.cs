using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Wow;

/// <summary>
/// Makes an installed Companion load as current on WoW: Forever.
///
/// The packaged addon is built for Midnight (<c>## Interface: 120100</c>).
/// Forever is a second Mainline-family game type (Camelot) whose beta reports
/// interface <c>16001</c>, so the same zip shows as out of date and, unless
/// the player ticks "Load out of date AddOns", never runs.
///
/// The private addon repo is not this repo. Rather than wait for a new zip,
/// we stamp a <c>WGFCompanion_Camelot.toc</c> (the suffix Forever looks for)
/// and a small shim next to whatever version is already on disk. The main
/// <c>.toc</c> is left alone so <see cref="AddonFolder.InstalledVersion"/>
/// still matches the manifest.
/// </summary>
public static class AddonForever
{
    public const string CamelotTocName = "WGFCompanion_Camelot.toc";
    public const string ShimRelativePath = "flavor/forever.lua";

    private static readonly UTF8Encoding Utf8 = new(encoderShouldEmitUTF8Identifier: false);
    private static readonly Regex InterfaceLine =
        new(@"^##\s*Interface\s*:.*$", RegexOptions.IgnoreCase | RegexOptions.Multiline);
    private static readonly Regex ShimLine =
        new(@"flavor[/\\]forever\.lua", RegexOptions.IgnoreCase);

    /// <summary>
    /// Idempotent. Safe to call on every sync pass; a junctioned source tree
    /// is still never touched.
    /// </summary>
    public static void EnsureStamped(string addonPath)
    {
        try
        {
            StampCore(addonPath);
        }
        catch (Exception ex)
        {
            // Never fail an install or a sync pass because the Camelot toc
            // could not be written. The Midnight addon is still on disk.
            Log.Warn($"Forever stamp skipped: {ex.Message}");
        }
    }

    private static void StampCore(string addonPath)
    {
        if (AddonFolder.IsDeveloperLink(addonPath)) return;

        var tocPath = Path.Combine(addonPath, AddonFolder.AddonName + ".toc");
        if (!File.Exists(tocPath)) return;

        string toc;
        try { toc = File.ReadAllText(tocPath); }
        catch (Exception ex)
        {
            Log.Warn($"could not read {tocPath} for Forever stamp: {ex.Message}");
            return;
        }

        var shim = LoadShim();
        var camelotToc = BuildCamelotToc(toc, shim is not null);
        var wrote = false;

        if (shim is not null)
            wrote |= WriteIfChanged(addonPath, ShimRelativePath, Utf8.GetBytes(shim));

        wrote |= WriteIfChanged(addonPath, CamelotTocName, Utf8.GetBytes(camelotToc));
        if (wrote)
            Log.Info($"Forever stamp: wrote {CamelotTocName} (interface {WowFlavors.CamelotInterface})");
    }

    private static bool WriteIfChanged(string addonPath, string relativePath, byte[] contents)
    {
        var full = Path.Combine(addonPath, relativePath.Replace('/', Path.DirectorySeparatorChar));
        try
        {
            if (File.Exists(full) && File.ReadAllBytes(full).AsSpan().SequenceEqual(contents))
                return false;
        }
        catch
        {
            // Could not compare; write. A rewrite is cheaper than a stale shim.
        }
        AddonFolder.WriteFile(addonPath, relativePath, contents);
        return true;
    }

    /// <summary>
    /// Rewrite a Midnight toc into the Camelot one Forever will actually load.
    /// Public so the publisher can stamp a zip the same way the client does.
    /// </summary>
    public static string BuildCamelotToc(string sourceToc, bool includeShim)
    {
        var nl = sourceToc.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
        var text = InterfaceLine.Replace(sourceToc, "## Interface: " + WowFlavors.CamelotInterface, 1);
        if (!InterfaceLine.IsMatch(text))
            text = "## Interface: " + WowFlavors.CamelotInterface + nl + text;

        if (includeShim && !ShimLine.IsMatch(text))
        {
            text = text.TrimEnd('\r', '\n');
            text += nl + nl
                 + "# WoW: Forever (Camelot). Stamped by TheWoWDB Client so this" + nl
                 + "# copy loads in-date on interface 16001 without a new zip." + nl
                 + @"flavor\forever.lua" + nl;
        }

        if (!text.EndsWith(nl, StringComparison.Ordinal)) text += nl;
        return text;
    }

    private static string? LoadShim()
    {
        try
        {
            var asm = Assembly.GetExecutingAssembly();
            using var stream = asm.GetManifestResourceStream("forever.lua");
            if (stream is null)
            {
                Log.Warn("embedded forever.lua missing; Camelot toc will still be written");
                return null;
            }
            using var reader = new StreamReader(stream, Utf8);
            return reader.ReadToEnd();
        }
        catch (Exception ex)
        {
            Log.Warn($"could not load forever.lua shim: {ex.Message}");
            return null;
        }
    }
}
