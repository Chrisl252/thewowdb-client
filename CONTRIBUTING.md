# Contributing

## Adding a feature without growing a monolith

A unit of work is a **new file behind a named seam**, registered in one place.
Never add a second concern to an existing file.

- New way to find WoW -> a private source method in `Wow/WowInstallScanner.cs`,
  added to the array in `Scan`. That array is the registration line.
- New thing to keep updated -> a new entry type in `Sync/Manifest.cs` plus a
  block in `SyncService.RunAsync`. It downloads through `Downloader` and writes
  through `AddonFolder`; it does not open its own `HttpClient` or call
  `File.Write` itself.
- New window or panel -> a new file in `Ui/`, built with `Theme` helpers, opened
  from `TrayApp`. UI reads state and calls services; it decides nothing.
- New persisted option -> a property on `Core/Settings.cs` and a control in
  `MainForm.BuildFooter`. Defaults live on the property.

If a file passes ~400 lines or starts holding two domains, split it then, not later.

## Conventions

- Anything that writes into a WoW directory goes through `Wow/AddonFolder.cs`.
  That is where the junction guard, the zip-slip guard and atomic writes live,
  and one bypass makes all three optional.
- Anything that touches the network goes through `Sync/Downloader.cs`.
- Comments explain **why**, especially where the obvious code would be wrong:
  the junction guard, the size floor, the cache-buster on the manifest.
- Log at the boundaries. A background app that fails silently is unfixable.

## Verify before shipping

```
dotnet build src/TheWoWDB.Client -c Release      # must be 0 warnings
dotnet publish src/TheWoWDB.Client -c Release -o dist
```

Then run it against a real WoW install and confirm from evidence, not guesswork:

- `%LOCALAPPDATA%\TheWoWDB\client.log` shows the pass and what it decided
- the addon's `## Version` in the installed `.toc` matches the manifest
- `["build"]` at the top of the installed `data/MarketData.lua` matches the manifest
- a junctioned addon folder is reported as skipped and its files are unchanged

## Releasing

```
powershell -NoProfile -ExecutionPolicy Bypass -File tools\publish.ps1
```

Bump `<Version>` in `src/TheWoWDB.Client/TheWoWDB.Client.csproj` first; the tag,
the manifest entry and the reported version all derive from it. Use
`-SkipClient` for the daily data-only refresh.
