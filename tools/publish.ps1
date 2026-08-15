<#
.SYNOPSIS
    Publish the client, the addon, and the market data to the public download point.

.DESCRIPTION
    Every source repo in this operation is PRIVATE, and a release asset in a
    private repo is not downloadable without a token - so it cannot be the thing
    a user's client fetches. This repo (thewowdb-client) is the one PUBLIC repo,
    and its releases are the CDN:

      client-v<ver>  TheWoWDBClient.exe   the installer/updater itself
      live           manifest.json        what the client reads first
                     WGFCompanion.zip     the addon, mirrored from the private repo
                     MarketData.lua.gz    the daily price export, gzipped

    "live" is a fixed tag whose assets are clobbered in place, so the URLs the
    shipped executable knows about never change.

    The manifest is DERIVED, never hand-edited: addon version comes from the
    newest addon-v* release, the data build is read out of the export itself.
    Nothing here can drift from what actually shipped.

.PARAMETER SkipClient
    Only refresh the addon zip, the market data and the manifest. This is the
    daily path - the client executable changes rarely.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File tools\publish.ps1 -SkipClient
#>
[CmdletBinding()]
param(
    [string] $ClientRepo = "Chrisl252/thewowdb-client",
    [string] $AddonRepo  = "Chrisl252/wowgoldfarms",
    [string] $MarketData = "C:\Code\04_gaming_seo\wowgoldfarms\addon\WGFCompanion\data\MarketData.lua",
    [switch] $SkipClient,
    [int]    $MinDataBytes = 250000
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$work     = Join-Path $env:TEMP ("wowdb-publish-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Path $work -Force | Out-Null

function Say([string] $m) { Write-Host "  $m" }

function Sha256([string] $path) {
    return (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLower()
}

function GzipFile([string] $source, [string] $destination) {
    $in  = [System.IO.File]::OpenRead($source)
    try {
        $out = [System.IO.File]::Create($destination)
        try {
            $gz = New-Object System.IO.Compression.GZipStream($out, [System.IO.Compression.CompressionLevel]::Optimal)
            try { $in.CopyTo($gz) } finally { $gz.Dispose() }
        } finally { $out.Dispose() }
    } finally { $in.Dispose() }
}

# Create the release if it is not there yet, then upload with --clobber so the
# asset URL survives every republish.
#
# Existence is tested by LISTING, not by `gh release view ... *> $null`: in
# PS 5.1 redirecting a native command's stderr wraps each line in an
# ErrorRecord, so gh's ordinary "release not found" became a terminating
# NativeCommandError and killed the script.
function PublishAsset([string] $repo, [string] $tag, [string] $title, [string] $file) {
    $tags = @(gh release list -R $repo --limit 100 --json tagName -q '.[].tagName')
    if ($LASTEXITCODE -ne 0) { throw "could not list releases for $repo" }
    $exists = $tags -contains $tag
    if (-not $exists) {
        Say "creating release $tag"
        gh release create $tag -R $repo --title $title --notes "Published by tools/publish.ps1. Assets here are clobbered in place; the URLs are stable." | Out-Null
    }
    gh release upload $tag -R $repo $file --clobber | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "upload of $file to $tag failed" }
}

try {
    # ---- 1. the client executable ----------------------------------------
    $clientVersion = ([xml](Get-Content (Join-Path $repoRoot "src\TheWoWDB.Client\TheWoWDB.Client.csproj"))).Project.PropertyGroup.Version | Where-Object { $_ }
    $clientVersion = ($clientVersion | Select-Object -First 1).ToString().Trim()
    $clientTag = "client-v$clientVersion"
    $exe = Join-Path $repoRoot "dist\TheWoWDBClient.exe"

    if (-not $SkipClient) {
        Say "building client $clientVersion"
        dotnet publish (Join-Path $repoRoot "src\TheWoWDB.Client") -c Release -o (Join-Path $repoRoot "dist") --nologo -v q | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }
        PublishAsset $ClientRepo $clientTag "TheWoWDB Client $clientVersion" $exe
    }
    if (-not (Test-Path $exe)) { throw "no client build at $exe - run without -SkipClient first" }
    $clientSha = Sha256 $exe

    # ---- 2. mirror the newest addon build ---------------------------------
    Say "reading newest addon release from $AddonRepo"
    # Filtering happens in PowerShell, not in a jq expression: PS mangles the
    # inner double quotes of `startswith("addon-v")`, and jq then reports
    # "function not defined: v/0" while gh still exits 0 - a silent wrong answer.
    $addonTag = @(gh release list -R $AddonRepo --limit 100 --json tagName -q '.[].tagName' |
                  Where-Object { $_ -like 'addon-v*' }) | Select-Object -First 1
    if (-not $addonTag) { throw "no addon-v* release found in $AddonRepo" }
    $addonVersion = $addonTag -replace '^addon-v', ''

    $addonDir = Join-Path $work "addon"
    New-Item -ItemType Directory -Path $addonDir -Force | Out-Null
    gh release download $addonTag -R $AddonRepo -p "*.zip" -D $addonDir | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "could not download the addon zip for $addonTag" }

    # One stable public name, whatever the private build called itself.
    $addonZip = Join-Path $work "WGFCompanion.zip"
    Copy-Item (Get-ChildItem $addonDir -Filter *.zip | Select-Object -First 1).FullName $addonZip -Force
    $addonSha = Sha256 $addonZip
    Say "addon $addonVersion ($([math]::Round((Get-Item $addonZip).Length / 1KB)) KB)"

    # ---- 3. the market data -----------------------------------------------
    if (-not (Test-Path $MarketData)) { throw "market data export missing: $MarketData" }
    $dataBytes = (Get-Item $MarketData).Length
    if ($dataBytes -lt $MinDataBytes) {
        # The same guard the daily refresh uses. An export that "succeeded" with
        # almost no rows must never reach a user's game.
        throw "market data is only $dataBytes bytes (under $MinDataBytes); refusing to publish it"
    }

    $head = Get-Content $MarketData -TotalCount 1
    $build = 0
    if ($head -match '\["build"\]=(\d+)') { $build = [int64]$Matches[1] }
    $generated = 0
    if ($head -match '\["generated"\]=(\d+)') { $generated = [int64]$Matches[1] }
    if ($build -eq 0) { throw "could not read the build stamp out of $MarketData" }

    $dataGz = Join-Path $work "MarketData.lua.gz"
    GzipFile $MarketData $dataGz
    $dataSha = Sha256 $dataGz
    Say "market data build $build ($([math]::Round((Get-Item $dataGz).Length / 1KB)) KB gzipped)"

    # ---- 4. the manifest ---------------------------------------------------
    $base = "https://github.com/$ClientRepo/releases/download"
    $manifest = [ordered]@{
        schema = 1
        addon  = [ordered]@{
            version = $addonVersion
            url     = "$base/live/WGFCompanion.zip"
            sha256  = $addonSha
        }
        data   = [ordered]@{
            build     = $build
            generated = $generated
            url       = "$base/live/MarketData.lua.gz"
            sha256    = $dataSha
            target    = "data/MarketData.lua"
            gzip      = $true
        }
        client = [ordered]@{
            version = $clientVersion
            url     = "$base/$clientTag/TheWoWDBClient.exe"
            sha256  = $clientSha
            notes   = "https://thewowdb.com"
        }
    }
    $manifestPath = Join-Path $work "manifest.json"
    # WriteAllText with an explicit no-BOM encoding, NOT Set-Content -Encoding utf8:
    # PS 5.1's utf8 always emits a BOM, and a leading U+FEFF makes System.Text.Json
    # throw "'0xFEFF' is an invalid start of a value" -- the manifest would 200 and
    # still break every client.
    [System.IO.File]::WriteAllText(
        $manifestPath,
        ($manifest | ConvertTo-Json -Depth 6),
        (New-Object System.Text.UTF8Encoding($false)))

    # ---- 5. publish --------------------------------------------------------
    # Payloads first, manifest last: a client that reads the manifest mid-publish
    # must never be pointed at a file that is not there yet.
    PublishAsset $ClientRepo "live" "Live artifacts" $addonZip
    PublishAsset $ClientRepo "live" "Live artifacts" $dataGz
    PublishAsset $ClientRepo "live" "Live artifacts" $manifestPath

    Say ""
    Say "published: addon $addonVersion, data build $build, client $clientVersion"
    Say "manifest:  $base/live/manifest.json"
}
finally {
    Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}
