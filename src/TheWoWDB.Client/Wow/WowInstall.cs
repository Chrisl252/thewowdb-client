namespace TheWoWDB.Client.Wow;

/// <summary>One playable client inside a WoW installation (_retail_, _classic_era_, ...).</summary>
public sealed record WowFlavor(string Name, string Path)
{
    public string AddOnsDir => System.IO.Path.Combine(Path, "Interface", "AddOns");

    /// <summary>The human label Blizzard's launcher uses, so the UI reads like the game.</summary>
    public string DisplayName => WowFlavors.DisplayName(Name, Path);

    /// <summary>True for WoW: Forever (Camelot) and the 2026 beta that shipped under _classic_beta_.</summary>
    public bool IsForever => WowFlavors.IsForever(Name, Path);
}

public sealed record WowInstall(string Root, IReadOnlyList<WowFlavor> Flavors);
