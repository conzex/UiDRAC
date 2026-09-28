# Build uidrac-agent-setup.msi (Windows only, WiX v4 + Node pkg)
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "Building @idrac/edge-agent..."
pnpm --filter @idrac/edge-agent build

$WinDir = Join-Path $Root 'apps/edge-agent/windows'
$OutExe = Join-Path $WinDir 'uidrac-agent.exe'
$DistJs = Join-Path $Root 'apps/edge-agent/dist/index.js'

Write-Host "Packaging uidrac-agent.exe (node20-win-x64)..."
pnpm exec pkg $DistJs --targets node20-win-x64 --output $OutExe

$NssmZip = Join-Path $env:TEMP 'nssm-2.24.zip'
$NssmDir = Join-Path $env:TEMP 'nssm-2.24'
if (-not (Test-Path (Join-Path $WinDir 'nssm.exe'))) {
  Write-Host "Downloading NSSM 2.24..."
  Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $NssmZip
  Expand-Archive -Path $NssmZip -DestinationPath $env:TEMP -Force
  Copy-Item (Join-Path $NssmDir 'win64/nssm.exe') (Join-Path $WinDir 'nssm.exe') -Force
}

$InstallerDir = Join-Path $Root 'apps/edge-agent/installer'
$OutMsi = Join-Path $InstallerDir 'out/uidrac-agent-setup.msi'
New-Item -ItemType Directory -Force -Path (Split-Path $OutMsi) | Out-Null

if (-not (Get-Command wix -ErrorAction SilentlyContinue)) {
  Write-Error "Install WiX v4 CLI: dotnet tool install --global wix"
}

Push-Location $InstallerDir
wix build Product.wxs -o $OutMsi
Pop-Location

Write-Host "Built: $OutMsi"
Write-Host "Publish to API (COPY to agent-windows/) or serve via GET /api/agent/download/msi"
