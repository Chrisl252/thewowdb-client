<#
.SYNOPSIS
    The daily job: publish the fresh market data so installed clients pick it up.

.DESCRIPTION
    "WGF Addon Market Data Refresh" (6am) already exports MarketData.lua into the
    addon source. That only serves the machine it runs on -- the file has to reach
    the public manifest before anybody else's game sees a new price.

    This runs after it and republishes. It is deliberately a separate task rather
    than an edit to the existing refresh script: that script's job is the local
    dev loop, and a network publish failing must not make a local refresh look
    broken.

    Logs to %LOCALAPPDATA%\TheWoWDB\publish.log because the run-hidden.vbs
    launcher makes Task Scheduler's LastTaskResult meaningless (it reports
    wscript's immediate exit, always 0).
#>
[CmdletBinding()]
param(
    [string] $LogFile = (Join-Path $env:LOCALAPPDATA "TheWoWDB\publish.log")
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Keep the log from growing without bound; this runs every day forever.
if ((Test-Path $LogFile) -and (Get-Item $LogFile).Length -gt 512KB) {
    Move-Item $LogFile "$LogFile.1" -Force
}

try {
    $output = & powershell -NoProfile -ExecutionPolicy Bypass `
        -File (Join-Path $PSScriptRoot "publish.ps1") -SkipClient
    $code = $LASTEXITCODE
    Add-Content -Path $LogFile -Value "[$stamp] $($output -join ' | ')" -Encoding utf8
    if ($code -ne 0) { throw "publish.ps1 exited $code" }
    Add-Content -Path $LogFile -Value "[$stamp] OK" -Encoding utf8
}
catch {
    Add-Content -Path $LogFile -Value "[$stamp] FAILED: $($_.Exception.Message)" -Encoding utf8
    exit 1
}
