namespace TheWoWDB.Client.Wow;

/// <summary>One playable client inside a WoW installation (_retail_, _classic_era_, ...).</summary>
public sealed record WowFlavor(string Name, string Path)
{
    public string AddOnsDir => System.IO.Path.Combine(Path, "Interface", "AddOns");

    /// <summary>The human label Blizzard's launcher uses, so the UI reads like the game.</summary>
    public string DisplayName => Name switch
    {
        "_retail_" => "Retail",
        "_classic_" => "Classic",
        "_classic_era_" => "Classic Era",
        "_classic_ptr_" => "Classic PTR",
        "_classic_beta_" => "Classic Beta",
        "_ptr_" => "PTR",
        "_xptr_" => "PTR 2",
        "_beta_" => "Beta",
        "_anniversary_" => "Anniversary",
        _ => Name.Trim('_'),
    };
}

public sealed record WowInstall(string Root, IReadOnlyList<WowFlavor> Flavors);
