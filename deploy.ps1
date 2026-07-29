# ========================================
#   Porta - cPanel Deployer
# ========================================

Write-Host ""
Write-Host "=== Porta - cPanel Deployer ===" -ForegroundColor Cyan
Write-Host ""

function Test-Command($cmd) {
    try { Get-Command $cmd -ErrorAction Stop; return $true }
    catch { return $false }
}

if (-not (Test-Command "php"))   { Write-Host "[ERROR] PHP not found" -ForegroundColor Red; exit 1 }
if (-not (Test-Command "composer")) { Write-Host "[ERROR] Composer not found" -ForegroundColor Red; exit 1 }
if (-not (Test-Command "node"))  { Write-Host "[ERROR] Node.js not found" -ForegroundColor Red; exit 1 }

Write-Host "[OK] All dependencies found" -ForegroundColor Green
Write-Host ""

$DOMAIN = Read-Host "Enter your domain (e.g., mysite.com) [Enter for yourdomain.com]"
if ([string]::IsNullOrEmpty($DOMAIN)) { $DOMAIN = "yourdomain.com" }

Write-Host "[INFO] Domain: $DOMAIN" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== Step 1/3: Building Frontend ===" -ForegroundColor Cyan
Set-Location frontend
npm install
npm run build
Set-Location ..
Write-Host "[OK] Frontend built" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 2/3: Installing Backend Dependencies ===" -ForegroundColor Cyan
Set-Location backend
composer install --no-dev --optimize-autoloader
Set-Location ..
Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 3/3: Creating Deployment Package ===" -ForegroundColor Cyan

$DEPLOY = "deploy"
if (Test-Path $DEPLOY) { Remove-Item -Recurse -Force $DEPLOY }
New-Item -ItemType Directory -Path $DEPLOY | Out-Null

Copy-Item -Path "backend" -Destination "$DEPLOY\backend" -Recurse

$distPath = "frontend\dist"
if (Test-Path $distPath) {
    Copy-Item -Path "$distPath\*" -Destination "$DEPLOY\backend\public" -Recurse -Force
}

if (Test-Path "database.sql") {
    Copy-Item -Path "database.sql" -Destination "$DEPLOY\database.sql"
}

Remove-Item -Path "$DEPLOY\backend\tests" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY\backend\test_*.php" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY\backend\php_server*.log" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY\backend\.env" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY\backend\.env.*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY\backend\.git" -Recurse -Force -ErrorAction SilentlyContinue

$APP_KEY = ""
Set-Location backend
$keyOut = php artisan key:generate --show 2>&1
Set-Location ..
foreach ($line in $keyOut) {
    if ($line -match "base64:.+") {
        $APP_KEY = $line.Trim()
    }
}
if ([string]::IsNullOrEmpty($APP_KEY)) {
    Write-Host "[ERROR] Could not generate APP_KEY" -ForegroundColor Red
    exit 1
}

$envLines = @(
    "APP_NAME=Porta",
    "APP_ENV=production",
    "APP_KEY=$APP_KEY",
    "APP_DEBUG=false",
    "APP_URL=https://$DOMAIN",
    "",
    "DB_CONNECTION=mysql",
    "DB_HOST=127.0.0.1",
    "DB_PORT=3306",
    "DB_DATABASE=YOUR_DB_NAME",
    "DB_USERNAME=YOUR_DB_USER",
    "DB_PASSWORD=YOUR_DB_PASSWORD",
    "",
    "BROADCAST_DRIVER=log",
    "CACHE_DRIVER=file",
    "FILESYSTEM_DISK=local",
    "QUEUE_CONNECTION=sync",
    "SESSION_DRIVER=database",
    "SESSION_LIFETIME=120",
    "",
    "SANCTUM_STATEFUL_DOMAINS=$DOMAIN",
    "SANCTUM_COLLISION_HASH_LENGTH=16",
    "",
    "BRS_API_KEY="
)
$envLines | Set-Content -Path "$DEPLOY\backend\.env"

$ht = @()
$ht += '<IfModule mod_rewrite.c>'
$ht += '    <IfModule mod_negotiation.c>'
$ht += '        Options -MultiViews -Indexes'
$ht += '    </IfModule>'
$ht += ''
$ht += '    RewriteEngine On'
$ht += ''
$ht += '    RewriteCond %{REQUEST_FILENAME} !-d'
$ht += '    RewriteCond %{REQUEST_FILENAME} !-f'
$ht += '    RewriteRule ^ index.php [L]'
$ht += ''
$ht += '    RewriteCond %{HTTP:Authorization} .'
$ht += '    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]'
$ht += '</IfModule>'
$ht | Set-Content -Path "$DEPLOY\backend\public\.htaccess"

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host ""
Write-Host "deploy\ folder is ready." -ForegroundColor Cyan
Write-Host ""
Write-Host "Before uploading to cPanel:" -ForegroundColor Yellow
Write-Host "  1. Edit deploy\backend\.env" -ForegroundColor White
Write-Host "     Set DB_DATABASE, DB_USERNAME, DB_PASSWORD" -ForegroundColor White
Write-Host "  2. Zip everything inside deploy\" -ForegroundColor White
Write-Host "  3. Upload ZIP to cPanel File Manager -> public_html" -ForegroundColor White
Write-Host "  4. Extract ZIP" -ForegroundColor White
Write-Host "  5. Import database.sql in phpMyAdmin" -ForegroundColor White
Write-Host "  6. Set Document Root to backend/public (e.g. public_html/porto.fuladpanjeh.ir/backend/public)" -ForegroundColor White
Write-Host "  7. Set storage/ and bootstrap/cache/ to 755" -ForegroundColor White