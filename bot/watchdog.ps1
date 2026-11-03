# Earth Mechanics bot qo'riqchisi: har daqiqada bot ishlayotganini tekshiradi, to'xtagan bo'lsa qayta yoqadi.
# Windows uyqudan chiqqanda botni "javob bermayapti" deb yopib qo'yishi mumkin - shunda bot o'zi tiklanadi.
# Startup yorlig'i start_bot_hidden.vbs orqali shu skriptni ishga tushiradi.
$ErrorActionPreference = 'Continue'
$python = 'C:\Users\User\AppData\Local\Python\pythoncore-3.14-64\python.exe'
$botDir = 'D:\Earth_Mechanics_bot'
$log    = Join-Path $botDir 'data\watchdog.log'

# Faqat bitta qo'riqchi ishlasin.
$created = $false
$mutex = New-Object System.Threading.Mutex($true, 'Global\EarthMechanicsBotWatchdog', [ref]$created)
if (-not $created) { exit 0 }

function Get-Bot { Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object CommandLine -like '*bot.py*' }

while ($true) {
    if (-not (Get-Bot)) {
        "$(Get-Date -Format s) bot ishlamayapti - qayta ishga tushirilmoqda" | Out-File $log -Append -Encoding utf8
        Start-Process -FilePath $python -ArgumentList "`"$botDir\bot.py`"" -WorkingDirectory $botDir -WindowStyle Hidden
        Start-Sleep 20
    }
    Start-Sleep 60
}
