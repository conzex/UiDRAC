#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Install Conzex UiDRAC Agent as a Windows service.

  Copyright (c) 2026 Conzex Global Private Limited. All rights reserved.
  Authorized use only with a valid Universal iDRAC Console tenant on Conzex cloud.
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Config,

  [string] $InstallDir = "${env:ProgramFiles}\Conzex\UiDRAC Agent"
)

Write-Host "Conzex UiDRAC Agent — Copyright (c) 2026 Conzex Global Private Limited"

$ErrorActionPreference = 'Stop'
$ServiceName = 'UiDRACAgent'
$ServiceDisplay = 'Conzex UiDRAC Agent'
$DataDir = "${env:ProgramData}\Conzex\UiDRAC"
$AgentConfigDest = Join-Path $DataDir 'agent.json'
$LogDir = Join-Path $DataDir 'logs'

if (-not (Test-Path -LiteralPath $Config)) {
  Write-Error "Config not found: $Config"
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Copy-Item -LiteralPath $Config -Destination $AgentConfigDest -Force
Write-Host "Agent config -> $AgentConfigDest"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NssmSrc = @(
  (Join-Path $ScriptDir 'nssm.exe'),
  (Join-Path $InstallDir 'nssm.exe'),
  "${env:ProgramFiles}\Conzex\UiDRAC Agent\nssm.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

$AgentExeSrc = @(
  (Join-Path $ScriptDir 'uidrac-agent.exe'),
  (Join-Path $InstallDir 'uidrac-agent.exe'),
  "${env:ProgramFiles}\Conzex\UiDRAC Agent\uidrac-agent.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $NssmSrc) {
  Write-Error "Missing nssm.exe. Install uidrac-agent-setup.msi from the portal, or place nssm.exe next to this script (see apps/edge-agent/windows/README.md)."
}

if ($AgentExeSrc) {
  Copy-Item -LiteralPath $AgentExeSrc -Destination (Join-Path $InstallDir 'uidrac-agent.exe') -Force
  Copy-Item -LiteralPath $NssmSrc -Destination (Join-Path $InstallDir 'nssm.exe') -Force
  $installSelf = $MyInvocation.MyCommand.Path
  if (Test-Path -LiteralPath $installSelf) {
    Copy-Item -LiteralPath $installSelf -Destination (Join-Path $InstallDir 'install.ps1') -Force
  }
  $Uninstall = Join-Path $ScriptDir 'uninstall.ps1'
  if (Test-Path -LiteralPath $Uninstall) {
    Copy-Item -LiteralPath $Uninstall -Destination (Join-Path $InstallDir 'uninstall.ps1') -Force
  }
  $ConsoleSrc = Join-Path $ScriptDir '..\console\public'
  if (Test-Path -LiteralPath $ConsoleSrc) {
    $ConsoleDest = Join-Path $InstallDir 'console\public'
    New-Item -ItemType Directory -Force -Path $ConsoleDest | Out-Null
    Copy-Item -LiteralPath (Join-Path $ConsoleSrc '*') -Destination $ConsoleDest -Force
  }
}

$AgentExe = Join-Path $InstallDir 'uidrac-agent.exe'
$Nssm = Join-Path $InstallDir 'nssm.exe'
$ServiceApp = $AgentExe
$ServiceArgs = $null

if (-not (Test-Path -LiteralPath $AgentExe)) {
  $bundle = Join-Path $InstallDir 'agent-bundle.cjs'
  $runCmd = Join-Path $InstallDir 'run-uidrac-agent.cmd'
  if ((Test-Path -LiteralPath $bundle) -and (Test-Path -LiteralPath $runCmd)) {
    Write-Host "Using bundled agent (Node 20+): agent-bundle.cjs"
    $ServiceApp = $env:ComSpec
    $ServiceArgs = "/c `"$runCmd`""
  } else {
  Write-Host "uidrac-agent.exe not in $InstallDir — using Node.js npx @idrac/edge-agent (requires Node 20+)."
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Error "Install Node.js 20 LTS from https://nodejs.org/ or build/install uidrac-agent-setup.msi first."
  }
  $runCmd = Join-Path $InstallDir 'run-uidrac-agent.cmd'
  @"
@echo off
set UIDRAC_AGENT_CONFIG=$AgentConfigDest
set IDRAC_AGENT_CONFIG=$AgentConfigDest
cd /d "$InstallDir"
npx --yes @idrac/edge-agent
"@ | Set-Content -Path $runCmd -Encoding ASCII
  $ServiceApp = $env:ComSpec
  $ServiceArgs = "/c `"$runCmd`""
  }
} else {
  $ServiceArgs = $null
}

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  & $Nssm stop $ServiceName 2>$null
  & $Nssm remove $ServiceName confirm 2>$null
  Start-Sleep -Seconds 2
}

if ($ServiceArgs) {
  & $Nssm install $ServiceName $ServiceApp $ServiceArgs
} else {
  & $Nssm install $ServiceName $ServiceApp
}

& $Nssm set $ServiceName DisplayName $ServiceDisplay
& $Nssm set $ServiceName Description "Secure LAN bridge: connects your network iDRAC to Conzex Universal iDRAC Console cloud."
& $Nssm set $ServiceName Start SERVICE_AUTO_START
& $Nssm set $ServiceName AppDirectory $InstallDir
& $Nssm set $ServiceName AppStdout (Join-Path $LogDir 'agent.stdout.log')
& $Nssm set $ServiceName AppStderr (Join-Path $LogDir 'agent.stderr.log')
& $Nssm set $ServiceName AppRotateFiles 1
& $Nssm set $ServiceName AppRotateBytes 1048576

$envBlock = @(
  "UIDRAC_AGENT_CONFIG=$AgentConfigDest",
  "IDRAC_AGENT_CONFIG=$AgentConfigDest"
) -join "`n"
& $Nssm set $ServiceName AppEnvironmentExtra $envBlock

& $Nssm start $ServiceName
Write-Host "Service '$ServiceDisplay' started. Logs: $LogDir"
Write-Host "UiDRAC Agent console: portal -> Agents -> UiDRAC Agent console."
Write-Host "Verify Connected in the portal Agents list."
