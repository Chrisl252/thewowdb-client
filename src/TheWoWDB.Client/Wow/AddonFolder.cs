using System.IO.Compression;
using TheWoWDB.Client.Core;

namespace TheWoWDB.Client.Wow;

/// <summary>
/// Everything that writes into a WoW AddOns directory goes through here, so the
/// safety rules live in exactly one place.
/// </summary>
public static class AddonFolder
{
    public const string AddonName = "WGFCompanion";

    public static string PathIn(WowFlavor flavor) => Path.Combine(flavor.AddOnsDir, AddonName);

    /// <summary>
    /// True when the addon folder is a junction or symlink rather than a real
    /// directory. Addon developers (and this project's own author) link the
    /// folder straight at a git working tree; deleting it to "reinstall" would
    /// destroy uncommitted source. When this is true we touch nothing at all.
    /// </summary>
    public static bool IsDeveloperLink(string addonPath)
    {
        try
        {
            if (!Directory.Exists(addonPath)) return false;
            return File.GetAttributes(addonPath).HasFlag(FileAttributes.ReparsePoint);
        }
        catch (Exception ex)
        {
            // If we cannot tell, assume it IS a link. Refusing to write costs a
            // stale addon; guessing wrong costs someone's working tree.
            Log.Warn($"could not inspect {addonPath}, treating as a developer link: {ex.Message}");
            return true;
        }
    }

    public static string? InstalledVersion(string addonPath)
    {
        var toc = Path.Combine(addonPath, AddonName + ".toc");
        if (!File.Exists(toc)) return null;
        try
        {
            foreach (var raw in File.ReadLines(toc))
            {
                var line = raw.Trim();
                if (!line.StartsWith("## Version:", StringComparison.OrdinalIgnoreCase)) continue;
                return line["## Version:".Length..].Trim();
            }
        }
        catch (Exception ex)
        {
            Log.Warn($"could not read {toc}: {ex.Message}");
        }
        return null;
    }

    /// <summary>
    /// Replace the addon folder with the contents of a packaged zip.
    ///
    /// The zip from the release packager holds a single top-level folder named
    /// after the addon. We extract to a staging directory first and only swap it
    /// in once the extraction fully succeeded, so a half-downloaded file can
    /// never leave a broken addon in place.
    /// </summary>
    public static void InstallFromZip(string zipPath, WowFlavor flavor)
    {
        var target = PathIn(flavor);
        if (IsDeveloperLink(target))
            throw new DeveloperLinkException(target);

        Directory.CreateDirectory(flavor.AddOnsDir);
        var staging = Path.Combine(flavor.AddOnsDir, AddonName + ".installing");
        var previous = Path.Combine(flavor.AddOnsDir, AddonName + ".previous");

        DeleteDirectory(staging);
        DeleteDirectory(previous);
        Directory.CreateDirectory(staging);

        try
        {
            ExtractAddonFolder(zipPath, staging);

            if (!File.Exists(Path.Combine(staging, AddonName + ".toc")))
                throw new InvalidDataException($"the package has no {AddonName}.toc; refusing to install it");

            if (Directory.Exists(target)) Directory.Move(target, previous);
            Directory.Move(staging, target);
            DeleteDirectory(previous);
        }
        catch
        {
            // Put the working addon back before letting the error surface.
            if (!Directory.Exists(target) && Directory.Exists(previous))
                Directory.Move(previous, target);
            DeleteDirectory(staging);
            throw;
        }
    }

    /// <summary>
    /// Extract the archive, flattening the wrapper folder so we end up with
    /// AddOns\WGFCompanion\... regardless of how the zip was rolled. Entries are
    /// rejected if they resolve outside the destination (zip-slip).
    /// </summary>
    private static void ExtractAddonFolder(string zipPath, string destination)
    {
        using var zip = ZipFile.OpenRead(zipPath);
        var root = Path.GetFullPath(destination) + Path.DirectorySeparatorChar;
        var prefix = AddonName + "/";

        foreach (var entry in zip.Entries)
        {
            var name = entry.FullName.Replace('\\', '/');
            if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                name = name[prefix.Length..];
            if (name.Length == 0) continue;

            var full = Path.GetFullPath(Path.Combine(destination, name.Replace('/', Path.DirectorySeparatorChar)));
            if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException($"package entry escapes the addon folder: {entry.FullName}");

            if (name.EndsWith('/'))
            {
                Directory.CreateDirectory(full);
                continue;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(full)!);
            entry.ExtractToFile(full, overwrite: true);
        }
    }

    /// <summary>Write one file inside an installed addon, atomically.</summary>
    public static void WriteFile(string addonPath, string relativePath, byte[] contents)
    {
        if (IsDeveloperLink(addonPath)) throw new DeveloperLinkException(addonPath);

        var full = Path.Combine(addonPath, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        var tmp = full + ".tmp";
        File.WriteAllBytes(tmp, contents);
        File.Move(tmp, full, overwrite: true);
    }

    private static void DeleteDirectory(string path)
    {
        if (!Directory.Exists(path)) return;
        try { Directory.Delete(path, recursive: true); }
        catch (Exception ex) { Log.Warn($"could not remove {path}: {ex.Message}"); }
    }
}

public sealed class DeveloperLinkException(string path)
    : IOException($"{path} is a junction to a source folder; leaving it untouched");
