# PROJECT_STATE — thewowdb-client

## Start here (2026-10-06)
- **What:** Windows tray app (.NET 10, WinForms) that installs and updates the TheWoWDB Companion addon and refreshes its market-price file every 3 hours.
- **Live:** v1.0.2 released 2026-09-26 on https://github.com/Chrisl252/thewowdb-client/releases/latest (unsigned exe; SmartScreen warning expected).
- **1.0.2 change:** the retail Companion installs into retail clients only; WoW Forever (`_classic_beta_`) gets its own `TheWoWDB_Forever` addon, not from this client.
- **Data path:** `tools/daily.ps1` runs daily after the 6am "WGF Addon Market Data Refresh" task and republishes the manifest/market data (`tools/publish.ps1`); log at `%LOCALAPPDATA%\TheWoWDB\publish.log`.
- **Git:** `main` tracks `origin/main`, clean apart from the gitignored `backups/`.
- **Open risks:** exe is unsigned; market freshness depends on the CAPTAIN scheduled task chain (unverified this sweep whether it ran today).
- **Next step:** none queued. Consider shipping Forever addon updates through the same manifest if Forever-first demands it (unverified idea, not decided).

## Build / release
`dotnet publish src/TheWoWDB.Client -c Release -o dist` → `dist/TheWoWDBClient.exe`. Release publishing: `tools/publish.ps1`.

## Docs
[README.md](README.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [CONTRIBUTING.md](CONTRIBUTING.md)
