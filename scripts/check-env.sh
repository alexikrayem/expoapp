#!/bin/bash

# Environment Variables Checker
# Ensures all required environment variables are set before deployment

echo "🔍 Checking environment variables for all applications..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_env_file() {
    local app_name=$1
    local env_file=$2
    local required_vars=("${@:3}")
    
    echo -e "${YELLOW}📋 Checking $app_name...${NC}"
    
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}❌ $env_file not found${NC}"
        echo "   Create this file with the following variables:"
        for var in "${required_vars[@]}"; do
            echo "   $var=your_value_here"
        done
        echo ""
        return 1
    fi
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All required variables present${NC}"
    else
        echo -e "${RED}❌ Missing variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo "   $var"
        done
    fi
    echo ""
}

# Backend Environment Variables
backend_vars=("DATABASE_URL" "JWT_SECRET" "JWT_ADMIN_SECRET" "JWT_DELIVERY_SECRET" "PORT")
check_env_file "Backend" "telegram-app-backend/.env" "${backend_vars[@]}"

# Customer TMA Environment Variables  
customer_vars=("VITE_API_BASE_URL")
check_env_file "Customer TMA" "my-telegram-app/.env" "${customer_vars[@]}"

# Delivery Agent TMA Environment Variables
delivery_vars=("VITE_DELIVERY_API_BASE_URL")
check_env_file "Delivery Agent TMA" "delivery-agent-tma/.env" "${delivery_vars[@]}"

# Supplier Admin Panel Environment Variables
supplier_vars=("VITE_SUPPLIER_API_BASE_URL" "VITE_CLOUDINARY_CLOUD_NAME" "VITE_CLOUDINARY_UPLOAD_PRESET")
check_env_file "Supplier Admin Panel" "supplier-admin-panel/.env" "${supplier_vars[@]}"

# Platform Admin Panel Environment Variables
admin_vars=("VITE_ADMIN_API_BASE_URL")
check_env_file "Platform Admin Panel" "platform-admin-panel/.env" "${admin_vars[@]}"

echo -e "${YELLOW}💡 Tips:${NC}"
echo "1. Use different JWT secrets for each service"
echo "2. Set CORS_ORIGINS in backend to include all frontend URLs"
echo "3. Use HTTPS URLs in production"
echo "4. Keep secrets secure and never commit them to git"