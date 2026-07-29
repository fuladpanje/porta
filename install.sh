#!/bin/bash
# ========================================
#   Porta - cPanel Deployer
# ========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[OK]${NC} $1"; }
print_error()  { echo -e "${RED}[ERROR]${NC} $1"; }
print_info()   { echo -e "${CYAN}[INFO]${NC} $1"; }
print_warn()   { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Porta - cPanel Deployer                ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check dependencies
check_dep() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 not found. Please install it first."
        exit 1
    fi
}

check_dep php
check_dep composer
check_dep node
check_dep npm

print_status "All dependencies found"
echo ""

# ========================================
# Get domain name
# ========================================
echo -e "${YELLOW}Enter your domain (e.g., mysite.com):${NC}"
read -r DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain cannot be empty"
    exit 1
fi

print_info "Domain: $DOMAIN"
echo ""

# ========================================
# Step 1: Build Frontend
# ========================================
echo -e "${CYAN}━━━ Step 1/4: Building Frontend ━━━${NC}"
cd frontend
npm install
npm run build
cd ..
print_status "Frontend built"
echo ""

# ========================================
# Step 2: Install Backend Dependencies
# ========================================
echo -e "${CYAN}━━━ Step 2/4: Installing Backend Dependencies ━━━${NC}"
cd backend
composer install --no-dev --optimize-autoloader
cd ..
print_status "Backend dependencies installed"
echo ""

# ========================================
# Step 3: Create Deployment Package
# ========================================
echo -e "${CYAN}━━━ Step 3/4: Creating Deployment Package ━━━${NC}"

DEPLOY_DIR="deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy backend files
cp -r backend "$DEPLOY_DIR/backend"

# Copy frontend dist into public
cp -r frontend/dist/* "$DEPLOY_DIR/backend/public/"

# Copy installer to root
cp installer.php "$DEPLOY_DIR/installer.php"

# Remove unnecessary files
rm -rf "$DEPLOY_DIR/backend/tests"
rm -rf "$DEPLOY_DIR/backend/.git"
rm -rf "$DEPLOY_DIR/backend/test_*.php"
rm -rf "$DEPLOY_DIR/backend/php_server*.log"

# Create root .htaccess
cat > "$DEPLOY_DIR/backend/.htaccess" << 'EOF'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
EOF

# Create public .htaccess
cat > "$DEPLOY_DIR/backend/public/.htaccess" << 'EOF'
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
EOF

# Create ZIP
if command -v zip &> /dev/null; then
    cd "$DEPLOY_DIR"
    zip -r "../porta-deploy.zip" .
    cd ..
    print_status "Created: porta-deploy.zip"
else
    print_warn "zip not found. Skipping ZIP creation."
fi

print_status "Deployment package ready in deploy/ folder"
echo ""

# ========================================
# Step 4: Print Instructions
# ========================================
echo -e "${CYAN}━━━ Step 4/4: Deployment Instructions ━━━${NC}"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              DEPLOYMENT INSTRUCTIONS                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}1. cPanel Settings:${NC}"
echo "   - Go to cPanel → Domains → $DOMAIN"
echo "   - Set Document Root to: public_html/backend/public"
echo "   (or yourdomain.com/backend/public)"
echo ""
echo -e "${YELLOW}2. Upload Files:${NC}"
echo "   - Upload EVERYTHING inside deploy/ to public_html/"
echo "   - Including installer.php"
echo ""
echo -e "${YELLOW}3. Open Browser:${NC}"
echo "   - Go to: https://$DOMAIN/installer.php"
echo "   - Fill in the form and click Install!"
echo "   - NO SSH NEEDED!"
echo ""
echo -e "${YELLOW}4. After Install:${NC}"
echo "   - DELETE installer.php from server"
echo "   - Visit your site!"
echo ""
echo -e "${GREEN}Done! 🚀${NC}"
echo ""
