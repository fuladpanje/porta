@echo off
title Porta Setup
echo ================================
echo  Porta - Setup Script
echo ================================
echo.

echo [1/5] Checking PHP...
php -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: PHP is not installed or not in PATH.
    echo Install PHP 8.2+ and add it to PATH.
    pause
    exit /b 1
)
echo PHP found: %php%

echo.
echo [2/5] Checking Composer...
composer --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Composer is not installed.
    echo Download from https://getcomposer.org/download/
    pause
    exit /b 1
)

echo.
echo [3/5] Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    pause
    exit /b 1
)

echo.
echo [4/5] Installing backend dependencies...
cd backend
call composer install --no-interaction
if errorlevel 1 (
    echo ERROR: Composer install failed.
    pause
    exit /b 1
)
cd ..

echo.
echo [5/5] Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo WARNING: npm install may have issues. Check output above.
)
cd ..

echo.
echo ================================
echo  Setup complete! Next steps:
echo ================================
echo.
echo 1. Open XAMPP Control Panel and start MySQL and Apache
echo 2. Open phpMyAdmin (http://localhost/phpmyadmin)
echo 3. Create a database named "porta"
echo 4. Run these commands in "backend" folder:
echo      php artisan key:generate
echo      php artisan migrate
echo      php artisan serve --host=127.0.0.1 --port=8000
echo 5. In ANOTHER terminal, run in "frontend" folder:
echo      npm run dev
echo 6. Open http://localhost:5173 in browser
echo.
pause