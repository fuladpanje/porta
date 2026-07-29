@echo off
echo ========================================
echo   Porta - cPanel Deployer
echo ========================================
echo.

:: Step 1: Check PHP
php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PHP not found. Install PHP 8.2+ first.
    pause
    exit /b 1
)
echo [OK] PHP found

:: Step 2: Check Composer
composer --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Composer not found. Install Composer first.
    pause
    exit /b 1
)
echo [OK] Composer found

:: Step 3: Check Node
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install Node.js first.
    pause
    exit /b 1
)
echo [OK] Node.js found

echo.
echo ========================================
echo   Step 1: Building Frontend...
echo ========================================
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] npm run build failed
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend built to frontend\dist\

echo.
echo ========================================
echo   Step 2: Installing Backend Dependencies...
echo ========================================
cd backend
call composer install --no-dev --optimize-autoloader
if %errorlevel% neq 0 (
    echo [ERROR] composer install failed
    pause
    exit /b 1
)
cd ..
echo [OK] Backend dependencies installed

echo.
echo ========================================
echo   Step 3: Creating deployment package...
echo ========================================

:: Create deploy folder
if exist deploy rmdir /s /q deploy
mkdir deploy

:: Copy backend
echo Copying backend...
xcopy backend deploy\backend\ /E /I /H /Q /Y

:: Copy frontend dist into public
echo Merging frontend into public...
xcopy frontend\dist\* deploy\backend\public\ /E /I /H /Q /Y

:: Copy database.sql
if exist database.sql (
    copy database.sql deploy\database.sql
)

:: Remove test files and logs
del /q deploy\backend\test_*.php 2>nul
del /q deploy\backend\php_server*.log 2>nul
rmdir /s /q deploy\backend\tests 2>nul

:: Generate .env with APP_KEY
echo Generating .env...
cd deploy\backend
for /f "tokens=*" %%i in ('php artisan key:generate --show') do set APP_KEY=%%i
cd ..\..
echo APP_NAME=Porta> deploy\backend\.env
echo APP_ENV=production>> deploy\backend\.env
echo APP_KEY=%APP_KEY%>> deploy\backend\.env
echo APP_DEBUG=false>> deploy\backend\.env
echo APP_URL=https://yourdomain.com>> deploy\backend\.env
echo.>> deploy\backend\.env
echo DB_CONNECTION=mysql>> deploy\backend\.env
echo DB_HOST=127.0.0.1>> deploy\backend\.env
echo DB_PORT=3306>> deploy\backend\.env
echo DB_DATABASE=YOUR_DB_NAME>> deploy\backend\.env
echo DB_USERNAME=YOUR_DB_USER>> deploy\backend\.env
echo DB_PASSWORD=YOUR_DB_PASSWORD>> deploy\backend\.env
echo.>> deploy\backend\.env
echo BROADCAST_DRIVER=log>> deploy\backend\.env
echo CACHE_DRIVER=file>> deploy\backend\.env
echo FILESYSTEM_DISK=local>> deploy\backend\.env
echo QUEUE_CONNECTION=sync>> deploy\backend\.env
echo SESSION_DRIVER=database>> deploy\backend\.env
echo SESSION_LIFETIME=120>> deploy\backend\.env
echo.>> deploy\backend\.env
echo BRS_API_KEY=>> deploy\backend\.env

echo [DONE] Deployment package created in deploy\ folder
echo.

echo ========================================
echo   INSTRUCTIONS:
echo ========================================
echo.
echo   1. Edit deploy\backend\.env with your DB info
echo   2. Zip everything from deploy\ folder
echo   3. Upload ZIP to cPanel File Manager -> public_html/
echo   4. Extract ZIP in public_html/
echo   5. Import database.sql in phpMyAdmin
echo   6. Set Document Root to: public_html/backend/public
echo   7. Set storage/ and bootstrap/cache/ permissions to 755
echo.
pause