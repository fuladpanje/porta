@echo off
setlocal EnableDelayedExpansion
title Porta Dev Manager

for /F %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "GREEN=%ESC%[92m"
set "CYAN=%ESC%[96m"
set "GRAY=%ESC%[90m"
set "RESET=%ESC%[0m"

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

set "API_STAT=STOPPED"
set "SCHED_STAT=STOPPED"
set "WEB_STAT=STOPPED"

:menu
cls
echo %CYAN%========================================%RESET%
echo %CYAN% Porta Local Dev Manager%RESET%
echo %CYAN%========================================%RESET%
echo.
echo  Services run in THIS window (logs appear below the menu):
echo    [1] API        http://127.0.0.1:8000 ..... !API_STAT!
echo    [2] Scheduler  auto-refresh ............. !SCHED_STAT!
echo    [3] Web        http://127.0.0.1:5173 ..... !WEB_STAT!
echo.
echo %GREEN%   [4] Start ALL services%RESET%
echo    [5] Stop ALL services
echo    [0] Exit manager (also stops everything)
echo.
choice /c 123450 /n /m "Select option: "
if errorlevel 6 goto :exitstop
if errorlevel 5 goto :stopall
if errorlevel 4 goto :startall
if errorlevel 3 goto :startweb
if errorlevel 2 goto :startsched
if errorlevel 1 goto :startapi
goto :menu

:startapi
echo Starting API...
start "" /b /d "%BACKEND%" php artisan serve --host=127.0.0.1 --port=8000
set "API_STAT=RUNNING"
goto :menu

:startsched
echo Starting scheduler...
start "" /b /d "%BACKEND%" php artisan schedule:work
set "SCHED_STAT=RUNNING"
goto :menu

:startweb
echo Starting web...
start "" /b /d "%FRONTEND%" npm run dev
set "WEB_STAT=RUNNING"
goto :menu

:startall
echo Starting ALL services...
start "" /b /d "%BACKEND%" php artisan serve --host=127.0.0.1 --port=8000
start "" /b /d "%BACKEND%" php artisan schedule:work
start "" /b /d "%FRONTEND%" npm run dev
set "API_STAT=RUNNING"
set "SCHED_STAT=RUNNING"
set "WEB_STAT=RUNNING"
goto :menu

:stopall
echo Stopping ALL services...
powershell -noprofile -command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'php.exe' -and $_.CommandLine -like '*artisan serve*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
powershell -noprofile -command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'php.exe' -and $_.CommandLine -like '*schedule:work*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
powershell -noprofile -command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*vite*' -and $_.CommandLine -like '*frontend*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
set "API_STAT=STOPPED"
set "SCHED_STAT=STOPPED"
set "WEB_STAT=STOPPED"
goto :menu

:exitstop
call :killallquiet
endlocal
exit /b 0

:killallquiet
powershell -noprofile -command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'php.exe' -and $_.CommandLine -like '*artisan serve*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
powershell -noprofile -command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'php.exe' -and $_.CommandLine -like '*schedule:work*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
powershell -noprofile -command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*vite*' -and $_.CommandLine -like '*frontend*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
exit /b 0
