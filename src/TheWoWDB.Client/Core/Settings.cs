using System.Text.Json;
using System.Text.Json.Serialization;

namespace TheWoWDB.Client.Core;

/// <summary>User-owned state. Written atomically; a corrupt file falls back to defaults.</summary>
public sealed class Settings
{
    /// <summary>Flavor directories the user turned off, as full paths.</summary>
    public List<string> DisabledFlavors { get; set; } = new();

    /// <summary>WoW installs the scanner missed and the user pointed us at.</summary>
    public List<string> ExtraInstallPaths { get; set; } = new();

    public bool RunAtStartup { get; set; } = true;
    public bool KeepAddonUpdated { get; set; } = true;
    public bool KeepMarketDataFresh { get; set; } = true;
    public int CheckIntervalHours { get; set; } = 3;

    /// <summary>Set once the first successful install finishes, so we only greet once.</summary>
    public bool FirstRunDone { get; set; }

    /// <summary>
    /// Override the update manifest URL. Empty means the shipped default. This
    /// exists so a staging manifest can be tested against a real install without
    /// building a separate executable.
    /// </summary>
    public string? ManifestUrl { get; set; }

    [JsonIgnore] public string? LoadError { get; private set; }

    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static Settings Load()
    {
        try
        {
            if (File.Exists(AppPaths.SettingsFile))
            {
                var loaded = JsonSerializer.Deserialize<Settings>(
                    File.ReadAllText(AppPaths.SettingsFile), Options);
                if (loaded is not null) return loaded;
            }
        }
        catch (Exception ex)
        {
            Log.Warn($"settings unreadable, using defaults: {ex.Message}");
            return new Settings { LoadError = ex.Message };
        }
        return new Settings();
    }

    public void Save()
    {
        try
        {
            AppPaths.EnsureCreated();
            var tmp = AppPaths.SettingsFile + ".tmp";
            File.WriteAllText(tmp, JsonSerializer.Serialize(this, Options));
            File.Move(tmp, AppPaths.SettingsFile, overwrite: true);
        }
        catch (Exception ex)
        {
            Log.Error("could not save settings", ex);
        }
    }

    public bool IsFlavorEnabled(string flavorPath) =>
        !DisabledFlavors.Contains(flavorPath, StringComparer.OrdinalIgnoreCase);

    public void SetFlavorEnabled(string flavorPath, bool enabled)
    {
        DisabledFlavors.RemoveAll(p => string.Equals(p, flavorPath, StringComparison.OrdinalIgnoreCase));
        if (!enabled) DisabledFlavors.Add(flavorPath);
    }
}
