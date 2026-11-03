# Bot bo'sh bo'lganda (Claude yoki render ishlamayotganda) uni xavfsiz qayta ishga tushiradi.
$log = 'D:\Earth_Mechanics_bot\data\restart.log'
function Get-Bot { Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object CommandLine -like '*bot.py*' }
function Test-Busy($procId) {
    # busy.flag: bot biror ish ustida (agent, TTS, render). Bola jarayonlar - zaxira tekshiruv.
    (Test-Path 'D:\Earth_Mechanics_bot\data\busy.flag') -or
    @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$procId" | Where-Object Name -ne 'conhost.exe').Count -gt 0
}
"$(Get-Date -Format s) kutish boshlandi" | Out-File $log -Append -Encoding utf8
$idle = 0
while ($idle -lt 2) {
    $bot = Get-Bot | Select-Object -First 1
    if (-not $bot) { break }
    if (Test-Busy $bot.ProcessId) { $idle = 0 } else { $idle++ }
    Start-Sleep 15
}
Get-Bot | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -Confirm:$false }
Start-Sleep 3
Start-Process (Join-Path ([Environment]::GetFolderPath('Startup')) 'Earth Mechanics bot.lnk')
"$(Get-Date -Format s) qayta ishga tushirildi" | Out-File $log -Append -Encoding utf8
