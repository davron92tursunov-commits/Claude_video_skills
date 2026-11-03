# Copies the kit's skills into the user-level Claude skills folder (existing folders with the same name are overwritten).
$dst = Join-Path $env:USERPROFILE ".claude\skills"
New-Item -ItemType Directory -Force $dst | Out-Null
Get-ChildItem (Join-Path $PSScriptRoot "..\skills") -Directory | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $dst $_.Name) -Recurse -Force
  Write-Host "installed skill:" $_.Name
}
