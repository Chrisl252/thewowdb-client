# Architecture

One WinForms tray application. `Program.cs` is wiring only; every decision lives
behind a named seam so a new feature is a new file plus one registration line.

## Flow of a sync pass

```
TrayApp timer (every N hours)
  -> SyncService.RunAsync
       -> Downloader.GetManifestAsync      one JSON document, the only source of truth
       -> WowInstallScanner.Scan           every install and flavor on this PC
       -> for each enabled flavor:
            _forever_ -> ForeverAddonInstaller (TheWoWDB_Forever from manifest.foreverAddon;
                         absent = "not published yet", nothing installed)
            retail only for the Companion (classic-family = not for this game):
            AddonFolder.IsDeveloperLink?   junction -> skip entirely, touch nothing
            AddonFolder.InstalledVersion   read ## Version out of the .toc
            Downloader.DownloadToTempAsync verify sha256 before anything is used
            AddonFolder.InstallFromZip     stage, swap, roll back on failure
            AddonFolder.WriteFile          market data, written atomically
       -> UploadCoordinator.RunAfterSyncAsync   (Forever only; also fired by ForeverWatcher on a save)
            for every account under every enabled _forever_ flavor:
              read TheWoWDB_Forever.lua (shared read) -> CollectUploader (wire)  /  ScanUploader (AH scans)
              UploadSender: UploadBudget guard -> ONE POST (30 s) -> status -> cool-down
  -> SyncReport -> MainForm rows / tray balloon
```

## Modules

| File | Owns |
|---|---|
| `Program.cs` | Startup wiring: single-instance mutex, settings load, icon, `Application.Run`. No behaviour. |
| `Core/AppPaths.cs` | Every path the app uses. Nothing else builds one. |
| `Core/Settings.cs` | User state as JSON in `%LOCALAPPDATA%\TheWoWDB`. Atomic save, defaults on corruption. |
| `Core/Log.cs` | The rolling log file. The only evidence that exists when a background run misbehaves. |
| `Core/AppInfo.cs` | Name, version, public URLs. |
| `Wow/WowInstall.cs` | `WowInstall` / `WowFlavor` records and their display names. |
| `Wow/WowInstallScanner.cs` | Finding WoW: registry, Battle.net `product.db`, common paths, user-added paths. |
| `Wow/AddonFolder.cs` | **Everything that writes into an AddOns directory.** Junction guard, zip-slip guard, staged install, atomic file write. |
| `Sync/Manifest.cs` | The manifest contract (addon / data / client entries). |
| `Sync/Downloader.cs` | All network access and hash verification. The only `HttpClient`. |
| `Sync/SyncService.cs` | The pass itself: compare, download once, apply per flavor, report. |
| `Wow/ForeverSavedVariables.cs` | Where `TheWoWDB_Forever.lua` lives per account, and the one shared-read of it. |
| `Sync/ForeverAddonInstaller.cs` | Installs/updates `TheWoWDB_Forever` through `AddonFolder` (junction guard, staged swap). |
| `Sync/WireExtractor.cs` | Pure: lifts the `TWDBC1~` string out of Lua text, decodes escapes, counts records. |
| `Sync/LuaTable.cs` | Pure: reads one `key = { ... }` table out of a SavedVariables file. |
| `Sync/UploadState.cs` | Persisted `uploads.json`: attempts, per-file hashes, door cool-downs, manifest switches. |
| `Sync/UploadBudget.cs` | Pure rate guard: 1 per 20 min, 10 per day, 404 = 6 h, 429 = 2/6/24 h, failure = 1 h. |
| `Sync/UploadSender.cs` | The transport seam (`IUploadTransport`) and one guarded POST per call. |
| `Sync/CollectUploader.cs` | POST /api/collect/upload: the collected wire, deduped by SHA-256. |
| `Sync/ScanUploader.cs` | POST /api/addon/scan: completed Forever AH scans as NDJSON, newest per realm, deduped by id. |
| `Sync/ForeverWatcher.cs` | FileSystemWatcher over `WTF\Account`, 20 s debounce. |
| `Sync/UploadCoordinator.cs` | Runs both uploaders per file, owns the state, produces the row's "last upload" line. |
| `Ui/Theme.cs` | The site palette and the hand-rolled dark controls. |
| `Ui/FlavorRow.cs` | One detected client as a row. |
| `Ui/MainForm.cs` | The window. A view over `SyncService`; holds no update logic. |
| `Ui/TrayApp.cs` | Lifetime: tray icon, menu, timer, first-run notification. |
| `tests/TheWoWDB.Client.Tests` | xUnit: wire extractor, Lua reader, dedupe-by-hash, rate guard, door/429 handling, Forever install + junction guard (all in temp folders). `THEWOWDB_HOME` redirects client state. |
| `Startup/AutoStart.cs` | The HKCU Run key, and nothing else. |

## Delivery

Source repos in this operation are private, and a release asset in a private
repo is not publicly downloadable. **This repo is the one public repo**, and its
releases are the download point:

| Tag | Assets | Refreshed |
|---|---|---|
| `client-v<ver>` | `TheWoWDBClient.exe` | when the client changes |
| `live` | `manifest.json`, `WGFCompanion.zip`, `MarketData.lua.gz` | daily (data), on addon release (zip) |

`live` is a fixed tag whose assets are clobbered in place, so the URLs compiled
into shipped executables never change. `tools/publish.ps1` derives the manifest
from what actually exists rather than from anything hand-written.

## Rules this code keeps

1. **Never write into a reparse point.** A junctioned addon folder is somebody's
   git working tree. If we cannot tell whether it is one, we assume it is.
2. **Verify before use.** Downloads are hashed against the manifest, and an
   install is staged and only swapped in once extraction fully succeeded.
3. **An empty export is worse than no export.** The publisher refuses market
   data under a size floor; the addon showing nothing looks like an addon bug.
4. **Uploads are opt-in twice and never loop.** The manifest flag (`collectUpload`,
   `scanUpload`) AND the player's checkbox; one attempt per call, hard 30 s timeout,
   404 (door off) silent for 6 h, 429 backs off, unchanged content is never re-sent.
5. **One `HttpClient`, one paths class, one log.** Shared concerns have one home.
