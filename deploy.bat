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

:: Copy frontend dist into backend/public
echo Merging frontend into public...
xcopy frontend\dist\* deploy\backend\public\ /E /I /H /Q /Y

:: Copy installer to root
copy installer.php deploy\installer.php

:: Remove test files and logs
del /q deploy\backend\test_*.php 2>nul
del /q deploy\backend\php_server*.log 2>nul
rmdir /s /q deploy\backend\tests 2>nul

echo [DONE] Deployment package created in deploy\ folder
echo.

echo ========================================
echo   INSTRUCTIONS:
echo ========================================
echo.
echo   1. Upload EVERYTHING inside deploy\ folder
echo      (including installer.php) to public_html/
echo.
echo   2. The folder structure on server should be:
echo      public_html/
echo      ├── installer.php      (NEW!)
echo      ├── backend/
echo      │   ├── index.php
echo      │   ├── .htaccess
echo      │   ├── app/
echo      │   ├── config/
echo      │   ├── database/
echo      │   ├── public/        (frontend files)
echo      │   ├── routes/
echo      │   ├── storage/
echo      │   └── vendor/
echo.
echo   3. In cPanel, set Document Root to:
echo      public_html/backend/public
echo      (or yourdomain.com/backend/public)
echo.
echo   4. Open browser and go to:
echo      https://yourdomain.com/installer.php
echo.
echo   5. Fill in the form and click Install!
echo      (No SSH needed!)
echo.
echo   6. After install, DELETE installer.php!
echo.
echo   DONE! Visit your domain.
echo.
pause
