#Requires -RunAsAdministrator
param(
  [string] $InstallDir = "${env:ProgramFiles}\Conzex\UiDRAC Agent"
)

$ErrorActionPreference = 'Stop'
$ServiceName = 'UiDRACAgent'
$Nssm = Join-Path $InstallDir 'nssm.exe'

if (Test-Path -LiteralPath $Nssm) {
  & $Nssm stop $ServiceName 2>$null
  & $Nssm remove $ServiceName confirm 2>$null
} else {
  sc.exe stop $ServiceName 2>$null
  sc.exe delete $ServiceName 2>$null
}

Write-Host "UiDRAC agent service removed. Config remains in ${env:ProgramData}\Conzex\UiDRAC (delete manually if needed)."
