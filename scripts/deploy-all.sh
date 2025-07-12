#!/bin/bash

# Deploy All Apps Script
# Run this from the project root directory

echo "🚀 Starting deployment of all applications..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command succeeded
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 successful${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Function to deploy frontend app
deploy_frontend() {
    local app_name=$1
    local app_dir=$2
    
    echo -e "${YELLOW}📦 Building $app_name...${NC}"
    cd $app_dir
    npm install
    check_success "$app_name npm install"
    
    npm run build
    check_success "$app_name build"
    
    echo -e "${GREEN}✅ $app_name built successfully${NC}"
    echo "📁 Build files are in: $app_dir/dist"
    echo "🌐 Ready to deploy to your hosting provider"
    echo ""
    
    cd ..
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

echo "🔍 Checking project structure..."

# 1. Deploy Backend (should be deployed first)
echo -e "${YELLOW}🔧 Preparing Backend...${NC}"
if [ -d "telegram-app-backend" ]; then
    cd telegram-app-backend
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        echo -e "${RED}⚠️  Warning: No .env file found in telegram-app-backend${NC}"
        echo "Please create .env file with required variables before deploying backend"
        echo "Required variables: DATABASE_URL, JWT_SECRET, JWT_ADMIN_SECRET, JWT_DELIVERY_SECRET"
    fi
    
    npm install
    check_success "Backend npm install"
    
    echo -e "${GREEN}✅ Backend prepared${NC}"
    echo "🚀 Deploy backend first using your preferred method:"
    echo "   - Railway: railway deploy"
    echo "   - Heroku: git push heroku main"
    echo "   - VPS: pm2 start server.js"
    echo ""
    cd ..
else
    echo -e "${RED}❌ Backend directory not found${NC}"
    exit 1
fi

# 2. Build all frontend applications
echo -e "${YELLOW}🏗️  Building all frontend applications...${NC}"

# Customer TMA
if [ -d "my-telegram-app" ]; then
    deploy_frontend "Customer TMA" "my-telegram-app"
else
    echo -e "${RED}⚠️  Customer TMA directory not found${NC}"
fi

# Delivery Agent TMA  
if [ -d "delivery-agent-tma" ]; then
    deploy_frontend "Delivery Agent TMA" "delivery-agent-tma"
else
    echo -e "${RED}⚠️  Delivery Agent TMA directory not found${NC}"
fi

# Supplier Admin Panel
if [ -d "supplier-admin-panel" ]; then
    deploy_frontend "Supplier Admin Panel" "supplier-admin-panel"
else
    echo -e "${RED}⚠️  Supplier Admin Panel directory not found${NC}"
fi

# Platform Admin Panel
if [ -d "platform-admin-panel" ]; then
    deploy_frontend "Platform Admin Panel" "platform-admin-panel"
else
    echo -e "${RED}⚠️  Platform Admin Panel directory not found${NC}"
fi

echo -e "${GREEN}🎉 All applications built successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. 🔧 Deploy backend first to get API URL"
echo "2. 🔄 Update frontend .env files with backend URL"
echo "3. 🔨 Rebuild frontends with updated environment variables"
echo "4. 🌐 Deploy each frontend to your hosting provider"
echo ""
echo -e "${YELLOW}📁 Build Locations:${NC}"
echo "   - Customer TMA: my-telegram-app/dist"
echo "   - Delivery Agent: delivery-agent-tma/dist"  
echo "   - Supplier Panel: supplier-admin-panel/dist"
echo "   - Admin Panel: platform-admin-panel/dist"
echo ""
echo -e "${YELLOW}🔗 Recommended Hosting:${NC}"
echo "   - Backend: Railway, Heroku, DigitalOcean"
echo "   - Frontends: Netlify, Vercel, Cloudflare Pages"