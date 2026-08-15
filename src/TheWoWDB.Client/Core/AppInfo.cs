using System.Reflection;

namespace TheWoWDB.Client.Core;

public static class AppInfo
{
    public const string Name = "TheWoWDB Client";
    public const string Site = "https://thewowdb.com";
    public const string AddonPage = "https://www.curseforge.com/wow/addons/thewowdb-companion";

    public static string Version { get; } =
        Assembly.GetExecutingAssembly().GetName().Version is { } v
            ? $"{v.Major}.{v.Minor}.{v.Build}"
            : "1.0.0";
}
