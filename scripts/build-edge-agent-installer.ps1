# Build Conzex UiDRAC Agent Windows installers (.exe + .msi)
# Run on Windows with: pwsh -File scripts/build-edge-agent-installer.ps1
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$VersionTs = Join-Path $Root 'packages/shared/src/version.ts'
if (Test-Path $VersionTs) {
  $Version = [regex]::Match((Get-Content $VersionTs -Raw), "APP_VERSION = '([^']+)'").Groups[1].Value
}
if (-not $Version) { $Version = '1.3.2' }
$MsiVersion = if ($Version -match '^(\d+\.\d+\.\d+)') { "$($Matches[1]).0" } else { '1.2.0.0' }

Write-Host "=== Conzex UiDRAC Agent Windows build (v$Version) ==="
Write-Host "Copyright (c) 2026 Conzex Global Private Limited"
Write-Host ""

Write-Host "[1/4] Building @idrac/edge-agent..."
pnpm --filter @idrac/edge-agent build

$WinDir = Join-Path $Root 'apps/edge-agent/windows'
$OutExe = Join-Path $WinDir 'uidrac-agent.exe'
$DistJs = Join-Path $Root 'apps/edge-agent/dist/index.js'

Write-Host "[2/4] Bundling agent (Node 20+ bundle + console)..."
pnpm --filter @idrac/edge-agent run build:win-bundle
$ConsoleSrc = Join-Path $Root 'apps/edge-agent/console/public'
$ConsoleDest = Join-Path $WinDir 'console/public'
if (Test-Path $ConsoleSrc) {
  New-Item -ItemType Directory -Force -Path $ConsoleDest | Out-Null
  Copy-Item -Path (Join-Path $ConsoleSrc '*') -Destination $ConsoleDest -Force
}

$NssmZip = Join-Path $env:TEMP 'nssm-2.24.zip'
$NssmDir = Join-Path $env:TEMP 'nssm-2.24'
if (-not (Test-Path (Join-Path $WinDir 'nssm.exe'))) {
  Write-Host "Downloading NSSM 2.24 (service wrapper, public domain)..."
  Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $NssmZip
  Expand-Archive -Path $NssmZip -DestinationPath $env:TEMP -Force
  Copy-Item (Join-Path $NssmDir 'win64/nssm.exe') (Join-Path $WinDir 'nssm.exe') -Force
}

$InstallerDir = Join-Path $Root 'apps/edge-agent/installer'
$OutDir = Join-Path $InstallerDir 'out'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$OutMsi = Join-Path $OutDir 'uidrac-agent-setup.msi'
$OutSetup = Join-Path $OutDir 'UidracAgentSetup.exe'

Write-Host "[3/4] Building MSI (WiX v4)..."
if (Get-Command wix -ErrorAction SilentlyContinue) {
  $wxs = Join-Path $InstallerDir 'Product.wxs'
  $wxsBuild = Join-Path $env:TEMP "uidrac-Product-$MsiVersion.wxs"
  (Get-Content $wxs -Raw) -replace 'Version="[^"]+"', "Version=`"$MsiVersion`"" | Set-Content $wxsBuild -NoNewline
  Push-Location $InstallerDir
  wix extension add WixToolset.UI.wixext 2>$null
  wix build $wxsBuild -ext WixToolset.UI.wixext -o $OutMsi
  Pop-Location
  Remove-Item $wxsBuild -Force -ErrorAction SilentlyContinue
  Write-Host "  MSI: $OutMsi"
} else {
  Write-Warning "WiX CLI not found. Install: dotnet tool install --global wix"
}

Write-Host "[4/4] Building setup.exe (Inno Setup)..."
$Iscc = @(
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($Iscc) {
  & $Iscc (Join-Path $InstallerDir 'uidrac-agent.iss')
  $BuiltExe = Join-Path $OutDir 'UidracAgentSetup.exe'
  if (Test-Path $BuiltExe) { Write-Host "  EXE: $BuiltExe" }
} else {
  Write-Warning "Inno Setup 6 not found. Install from https://jrsoftware.org/isinfo.php"
}

Write-Host ""
Write-Host "Publish to CDN + API:"
Write-Host "  WIN_EXE=$OutDir\UidracAgentSetup.exe pnpm agent:cdn-stage"
Write-Host "  (places EXE/MSI under cdn-agent/ for upload and API download endpoints)"
Write-Host ""
Write-Host "Customer install (EXE): run UidracAgentSetup.exe, select uidrac-agent-win.json from portal"
Write-Host "Customer install (MSI): msiexec /i uidrac-agent-setup.msi then install.ps1 -Config <json>"
