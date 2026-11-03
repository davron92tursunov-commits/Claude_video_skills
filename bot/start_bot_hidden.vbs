' Earth Mechanics bot qo'riqchisini yashirin ishga tushiradi (Windows Startup yorlig'i shuni chaqiradi).
' Qo'riqchi (watchdog.ps1) botni yashirin konsolda ishga tushiradi va to'xtab qolsa qayta yoqadi.
' pythonw ishlatilmaydi: konsolsiz jarayonda Claude CLI yangi oyna ochadi va u yopilsa agent 129 bilan to'xtaydi.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "D:\Earth_Mechanics_bot"
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""D:\Earth_Mechanics_bot\watchdog.ps1""", 0, False
