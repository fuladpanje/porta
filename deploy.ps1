# ========================================
#   Porta - cPanel Deployer
#   PowerShell Version
#   Simple structure: everything in one folder for cPanel
# ========================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Porta - cPanel Deployer                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
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

$DOMAIN = Read-Host "Enter your domain (e.g., mysite.com)"
if ([string]::IsNullOrEmpty($DOMAIN)) { Write-Host "[ERROR] Domain cannot be empty" -ForegroundColor Red; exit 1 }

Write-Host "[INFO] Domain: $DOMAIN" -ForegroundColor Cyan
Write-Host ""

Write-Host "━━━ Step 1/3: Building Frontend ━━━" -ForegroundColor Cyan
Set-Location frontend
npm install
npm run build
Set-Location ..
Write-Host "[OK] Frontend built" -ForegroundColor Green
Write-Host ""

Write-Host "━━━ Step 2/3: Installing Backend Dependencies ━━━" -ForegroundColor Cyan
Set-Location backend
composer install --no-dev --optimize-autoloader
Set-Location ..
Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "━━━ Step 3/3: Creating Deployment Package ━━━" -ForegroundColor Cyan

$DEPLOY = "deploy"
if (Test-Path $DEPLOY) { Remove-Item -Recurse -Force $DEPLOY }
New-Item -ItemType Directory -Path $DEPLOY | Out-Null

Copy-Item -Path "backend" -Destination "$DEPLOY/backend" -Recurse

Copy-Item -Path "frontend/dist/*" -Destination "$DEPLOY/backend/public" -Recurse -Force

Copy-Item -Path "installer.php" -Destination "$DEPLOY/backend/public/installer.php"

Remove-Item -Path "$DEPLOY/backend/tests" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY/backend/test_*.php" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY/backend/php_server*.log" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY/backend/.env" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY/backend/.env.*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY/backend/.git" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY/backend/backend" -Recurse -Force -ErrorAction SilentlyContinue

$htaccessPublic = @"
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]

    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
</IfModule>
"@
Set-Content -Path "$DEPLOY/backend/public/.htaccess" -Value $htaccessPublic

Write-Host "[OK] Deployment package created in deploy\ folder" -ForegroundColor Green
Write-Host ""

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              DEPLOYMENT INSTRUCTIONS                    ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "1. Upload Files:" -ForegroundColor Yellow
Write-Host "   - Upload EVERYTHING inside deploy\ to your domain folder:" -ForegroundColor White
Write-Host "     public_html/YOUR_DOMAIN_FOLDER/" -ForegroundColor White
Write-Host "   - This places backend/ and installer.php at the same level" -ForegroundColor White
Write-Host ""
Write-Host "2. Set Document Root:" -ForegroundColor Yellow
Write-Host "   - cPanel → Domains → YOUR_DOMAIN → Manage" -ForegroundColor White
Write-Host "   - Set Document Root to: public_html/YOUR_DOMAIN_FOLDER/backend/public" -ForegroundColor White
Write-Host ""
Write-Host "3. Run Installer:" -ForegroundColor Yellow
Write-Host "   - Visit: https://YOUR_DOMAIN/installer.php" -ForegroundColor White
Write-Host "   - Fill in the form and click Install!" -ForegroundColor White
Write-Host ""
Write-Host "4. After Install:" -ForegroundColor Yellow
Write-Host "   - DELETE installer.php from backend/public/" -ForegroundColor White
Write-Host "   - Visit your site!" -ForegroundColor White
Write-Host ""
Write-Host "No SSH needed!" -ForegroundColor Green
Write-Host ""