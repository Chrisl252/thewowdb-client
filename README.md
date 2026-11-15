# TheWoWDB Client

A small Windows tray app that installs the **TheWoWDB Companion** addon into
every **retail** World of Warcraft client you have, keeps it updated, and refreshes its
market prices in the background.

Download: **[latest release](https://github.com/Chrisl252/thewowdb-client/releases/latest)** ·
Site: [thewowdb.com](https://thewowdb.com) ·
Addon: [CurseForge](https://www.curseforge.com/wow/addons/thewowdb-companion)

## Why it exists

WoW addons cannot make web requests. Every price addon therefore ships a
snapshot of the market baked into a Lua file, and that snapshot is only as fresh
as the last time something on your PC rewrote it. The addon alone cannot fix
this; nothing running inside the game can.

That is the entire job of this client: be the thing outside the game that keeps
the file current. Install it once and the prices in your tooltips stop going
stale.

## What it does

- Finds every WoW installation and flavor (Retail, Classic, Classic Era, Classic
  Anniversary, WoW Forever, PTR, Beta)
- Installs the Companion addon into each **retail** client you leave enabled
  (Classic-family clients show "retail addon, not for this game")
- Installs the **Forever edition** (`TheWoWDB_Forever`) into the WoW Forever client
  (`_forever_`) once the manifest publishes it; until then the row says so
- WoW Forever only, on by default and switchable in the window: shares what the
  Forever addon collected (drops, vendors, nodes, quest givers) and finished
  auction scans with thewowdb.com, automatically, a few times a day at most
- Updates the addon when a new version ships
- Refreshes the packaged market data on a timer (every 3 hours by default)
- Sits in the tray; nothing to open, nothing to remember

## What it does not do

- No account, no login, no telemetry.
- Retail and Classic: traffic is one-way (a manifest, an addon zip, a price file).
- WoW Forever: when "Share what I find" is ticked it reads the addon's own
  SavedVariables file (`TheWoWDB_Forever.lua`) and uploads only the collected
  records: game ids, map positions, NPC and quest names, your level, race and
  class, and when you played, plus finished auction scans with their realm.
  Never your character, account or guild names. Uploads are capped at one per
  20 minutes and 10 a day, and the server must switch the feature on first.
- It does not touch an addon folder that is a junction or symlink to a source
  tree, so a developer's working copy is never overwritten.

## Install

1. Download `TheWoWDBClient.exe` from the
   [latest release](https://github.com/Chrisl252/thewowdb-client/releases/latest).
2. Run it. It finds WoW, installs the addon, and moves to the system tray.
3. **Fully restart World of Warcraft** if it was running. WoW reads the addon
   directory at launch, so `/reload` is not enough for a newly installed addon.

The executable is unsigned, so SmartScreen will show "Windows protected your
PC" on first run: **More info** then **Run anyway**. Code signing certificates
cost several hundred dollars a year and this is a free tool.

It stores its settings and log in `%LOCALAPPDATA%\TheWoWDB`. To remove it:
quit from the tray, untick "Start with Windows" first, and delete the exe.

## Build from source

Requires the .NET 10 SDK.

```
dotnet publish src/TheWoWDB.Client -c Release -o dist
```

Produces one self-contained `dist/TheWoWDBClient.exe` with no runtime
prerequisites.

## Status

Live: v1.0.2 (2026-09-26) on GitHub Releases. Branch `feat/forever-uploader-20261115` = 1.1.0 (not released). A daily scheduled job
(`tools/daily.ps1`, after the 6am "WGF Addon Market Data Refresh" task) republishes
market data so installed clients pick it up. Current state: [PROJECT_STATE.md](PROJECT_STATE.md).

## Layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for the module map and
[CONTRIBUTING.md](CONTRIBUTING.md) for how to add to it.
