# PROJECT_STATE — thewowdb-client

## Start here (2026-11-15) - branch `feat/forever-uploader-20261115`, v1.1.0, NOT released
- **Built, local only (no push/release/manifest):** `_forever_` + `_anniversary_` flavors; `TheWoWDB_Forever` install from manifest key `foreverAddon` (absent = row says "Forever addon not published yet"); `CollectUploader` (POST /api/collect/upload) and `ScanUploader` (POST /api/addon/scan), gated by manifest `collectUpload` / `scanUpload` AND the user checkbox "Share what I find" (default on); "last upload" line per Forever row; 30 xUnit tests.
- **Release step owes:** add `foreverAddon {version,url,sha256}`, `collectUpload`, `scanUpload` to the manifest (`tools/publish.ps1` does not emit them yet); build + publish client 1.1.0. Server door /api/collect/upload answered 404 (flag off) when checked.
- **Open question:** AH scan upload sends every completed Forever snapshot in the addon's export ring (deduped), even if the player never clicked Send in-game; the addon keeps no persisted "ready" marker. Decide if that is acceptable before switching `scanUpload` on.

## Earlier (2026-10-06)
- **What:** Windows tray app (.NET 10, WinForms) that installs and updates the TheWoWDB Companion addon and refreshes its market-price file every 3 hours.
- **Live:** v1.0.2 released 2026-09-26 on https://github.com/Chrisl252/thewowdb-client/releases/latest (unsigned exe; SmartScreen warning expected).
- **1.0.2 change:** the retail Companion installs into retail clients only; WoW Forever gets its own `TheWoWDB_Forever` addon (live folder is `_forever_`; `_classic_beta_` was the beta).
- **Data path:** `tools/daily.ps1` runs daily after the 6am "WGF Addon Market Data Refresh" task and republishes the manifest/market data (`tools/publish.ps1`); log at `%LOCALAPPDATA%\TheWoWDB\publish.log`.
- **Git:** `main` tracks `origin/main`, clean apart from the gitignored `backups/`.
- **Open risks:** exe is unsigned; market freshness depends on the CAPTAIN scheduled task chain (unverified this sweep whether it ran today).
- **Next step:** none queued. Consider shipping Forever addon updates through the same manifest if Forever-first demands it (unverified idea, not decided).

## Build / release
`dotnet publish src/TheWoWDB.Client -c Release -o dist` → `dist/TheWoWDBClient.exe`. Release publishing: `tools/publish.ps1`.

## Docs
[README.md](README.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [CONTRIBUTING.md](CONTRIBUTING.md)
