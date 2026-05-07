#!/bin/bash

echo "🔍 TierVault Setup Validation"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Firebase project
echo "1. Checking Firebase Project..."
if firebase projects:list 2>/dev/null | grep -q "tiervault-tx"; then
    echo -e "${GREEN}✅ Firebase project 'tiervault-tx' is accessible${NC}"
else
    echo -e "${RED}❌ Cannot access Firebase project${NC}"
fi
echo ""

# Check Firebase web app
echo "2. Checking Firebase Web App..."
if firebase apps:list --project tiervault-tx 2>/dev/null | grep -q "tiervault"; then
    echo -e "${GREEN}✅ Firebase web app configured${NC}"
else
    echo -e "${RED}❌ Firebase web app not found${NC}"
fi
echo ""

# Check .env file
echo "3. Checking Environment Variables..."
if [ -f ".env" ]; then
    if grep -q "AIzaSyCyA8Buocap1uq2795o3bjPnNS0vbcOGJM" .env; then
        echo -e "${GREEN}✅ Firebase API key configured${NC}"
    else
        echo -e "${RED}❌ Firebase API key not found in .env${NC}"
    fi

    if grep -q "DO00DPTMC936A9MEK98V" .env; then
        echo -e "${GREEN}✅ Digital Ocean Access Key configured${NC}"
    else
        echo -e "${RED}❌ Digital Ocean Access Key not found${NC}"
    fi

    if grep -q "your_secret_key_here" .env; then
        echo -e "${YELLOW}⚠️  Digital Ocean Secret Key needs to be updated${NC}"
    else
        echo -e "${GREEN}✅ Digital Ocean Secret Key appears to be set${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
fi
echo ""

# Check Firestore
echo "4. Checking Firestore Database..."
if [ -f "firestore.rules" ]; then
    echo -e "${GREEN}✅ Firestore rules file exists${NC}"
else
    echo -e "${RED}❌ Firestore rules file missing${NC}"
fi
echo ""

# Check node_modules
echo "5. Checking Dependencies..."
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend dependencies need to be installed${NC}"
    echo "   Run: cd frontend && npm install"
fi

if [ -d "functions/node_modules" ]; then
    echo -e "${GREEN}✅ Functions dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Functions dependencies need to be installed${NC}"
    echo "   Run: cd functions && npm install"
fi
echo ""

# Summary
echo "=============================="
echo "📋 Next Steps:"
echo ""
echo "1. Fix npm cache permissions (if needed):"
echo "   sudo chown -R \$(whoami) ~/.npm"
echo ""
echo "2. Install dependencies:"
echo "   cd frontend && npm install"
echo "   cd ../functions && npm install"
echo ""
echo "3. Enable Firebase Authentication:"
echo "   https://console.firebase.google.com/project/tiervault-tx/authentication/providers"
echo "   Enable: Email/Password"
echo ""
echo "4. Verify Blaze Plan is enabled:"
echo "   https://console.firebase.google.com/project/tiervault-tx/usage"
echo "   Should show: Blaze (Pay as you go)"
echo ""
echo "5. Add Digital Ocean Secret Key to .env"
echo ""
echo "6. Create admin user in Firestore (see COMPLETE_SETUP.md)"
echo ""
echo "7. Start development:"
echo "   Terminal 1: cd frontend && npm run dev"
echo "   Terminal 2: firebase emulators:start"
echo ""
