@echo off
REM اجرای یک‌ضرب محیط لوکال پورتا: بک‌اند + اسکژولر خودکار + فرانت‌اند
REM کافی است همین یک فایل را دابل‌کلیک کنی.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

where wt >nul 2>&1
if %errorlevel%==0 goto :wt_mode

echo Windows Terminal پیدا نشد؛ هر سرویس در پنجره جدا باز می‌شود...
start "Porta API (:8000)" cmd /k "cd /d "%BACKEND%" && php artisan serve --host=127.0.0.1 --port=8000"
start "Porta Scheduler" cmd /k "cd /d "%BACKEND%" && php artisan schedule:work"
start "Porta Web (:5173)" cmd /k "cd /d "%FRONTEND%" && npm run dev"
goto :done

:wt_mode
echo هر سه سرویس در یک پنجره (سه پنل) باز می‌شوند...
start "" wt -d "%BACKEND%" cmd /k "php artisan serve --host=127.0.0.1 --port=8000" ^; new-tab -d "%BACKEND%" cmd /k "php artisan schedule:work" ^; new-tab -d "%FRONTEND%" cmd /k "npm run dev"

:done
echo.
echo  - API:       http://127.0.0.1:8000
echo  - Scheduler: رفرش خودکار طبق تنظیمات کاربر (بدون نیاز به مرورگر باز)
echo  - Web:       http://127.0.0.1:5173
echo.
echo برای توقف همه: پنجره(ها) را ببند.
pause
