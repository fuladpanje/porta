# ========================================
#   Porta - cPanel Deployer
#   PowerShell Version
# ========================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Porta - cPanel Deployer                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check dependencies
function Test-Command($cmd) {
    try { Get-Command $cmd -ErrorAction Stop; return $true }
    catch { return $false }
}

if (-not (Test-Command "php"))   { Write-Host "[ERROR] PHP not found" -ForegroundColor Red; exit 1 }
if (-not (Test-Command "composer")) { Write-Host "[ERROR] Composer not found" -ForegroundColor Red; exit 1 }
if (-not (Test-Command "node"))  { Write-Host "[ERROR] Node.js not found" -ForegroundColor Red; exit 1 }

Write-Host "[OK] All dependencies found" -ForegroundColor Green
Write-Host ""

# Get domain
$DOMAIN = Read-Host "Enter your domain (e.g., mysite.com)"
if ([string]::IsNullOrEmpty($DOMAIN)) { Write-Host "[ERROR] Domain cannot be empty" -ForegroundColor Red; exit 1 }

Write-Host "[INFO] Domain: $DOMAIN" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build Frontend
Write-Host "━━━ Step 1/4: Building Frontend ━━━" -ForegroundColor Cyan
Set-Location frontend
npm install
npm run build
Set-Location ..
Write-Host "[OK] Frontend built" -ForegroundColor Green
Write-Host ""

# Step 2: Install Backend Dependencies
Write-Host "━━━ Step 2/4: Installing Backend Dependencies ━━━" -ForegroundColor Cyan
Set-Location backend
composer install --no-dev --optimize-autoloader
Set-Location ..
Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Create Deployment Package
Write-Host "━━━ Step 3/4: Creating Deployment Package ━━━" -ForegroundColor Cyan

$DEPLOY = "deploy"
if (Test-Path $DEPLOY) { Remove-Item -Recurse -Force $DEPLOY }
New-Item -ItemType Directory -Path $DEPLOY | Out-Null

# Copy backend
Copy-Item -Path "backend" -Destination "$DEPLOY\backend" -Recurse

# Copy frontend dist into backend/public
Copy-Item -Path "frontend\dist\*" -Destination "$DEPLOY\backend\public" -Recurse -Force

# Copy installer to root
Copy-Item -Path "installer.php" -Destination "$DEPLOY\installer.php"

# Remove test files
Remove-Item -Path "$DEPLOY\backend\tests" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY\backend\test_*.php" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY\backend\php_server*.log" -Force -ErrorAction SilentlyContinue

# Remove env files
Remove-Item -Path "$DEPLOY\backend\.env" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$DEPLOY\backend\.env.*" -Force -ErrorAction SilentlyContinue

# Remove git files
Remove-Item -Path "$DEPLOY\backend\.git" -Recurse -Force -ErrorAction SilentlyContinue

# Create root .htaccess
$htaccessRoot = @"
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/`$1 [L]
</IfModule>
"@
Set-Content -Path "$DEPLOY\backend\.htaccess" -Value $htaccessRoot

# Create public .htaccess
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
Set-Content -Path "$DEPLOY\backend\public\.htaccess" -Value $htaccessPublic

Write-Host "[OK] Deployment package created in deploy\ folder" -ForegroundColor Green
Write-Host ""

# Step 4: Print Instructions
Write-Host "━━━ Step 4/4: Deployment Instructions ━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              DEPLOYMENT INSTRUCTIONS                    ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "1. cPanel Settings:" -ForegroundColor Yellow
Write-Host "   - Go to cPanel → Domains → $DOMAIN"
Write-Host "   - Set Document Root to: public_html/backend/public"
Write-Host ""
Write-Host "2. Upload Files:" -ForegroundColor Yellow
Write-Host "   - Upload EVERYTHING inside deploy\ to public_html/"
Write-Host "   - including installer.php"
Write-Host ""
Write-Host "3. Open Browser:" -ForegroundColor Yellow
Write-Host "   - Go to: https://$DOMAIN/installer.php"
Write-Host "   - Fill in the form and click Install!"
Write-Host ""
Write-Host "4. After Install:" -ForegroundColor Yellow
Write-Host "   - DELETE installer.php from server"
Write-Host "   - Visit your site!"
Write-Host ""
Write-Host "No SSH needed!" -ForegroundColor Green
Write-Host ""
