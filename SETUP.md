# TierVault Setup Guide

Complete step-by-step guide to set up TierVault locally and deploy to production.

## Prerequisites

1. **Node.js** >= 18.x
2. **npm** or **yarn**
3. **Firebase CLI**: `npm install -g firebase-tools`
4. **Firebase Account**: https://console.firebase.google.com
5. **Digital Ocean Account**: https://cloud.digitalocean.com

## Step 1: Firebase Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: `tiervault-prod` (or your choice)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 1.2 Enable Firebase Services

#### Enable Authentication
1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method

#### Enable Firestore
1. Go to **Firestore Database**
2. Click "Create database"
3. Choose production mode
4. Select location (closest to your users)

#### Enable Cloud Functions
1. Go to **Functions**
2. Upgrade to **Blaze Plan** (pay-as-you-go) - required for Functions
3. Set billing alerts to avoid surprises

### 1.3 Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click **Web** icon (</>) to add a web app
4. Register app name: "TierVault Web"
5. Copy the Firebase configuration object

### 1.4 Create Firebase Service Account

1. Go to **Project Settings** > **Service Accounts**
2. Click "Generate new private key"
3. Save the JSON file securely (needed for Functions)

## Step 2: Digital Ocean Spaces Setup

### 2.1 Create Spaces Bucket

1. Log in to [Digital Ocean](https://cloud.digitalocean.com)
2. Go to **Spaces** (Object Storage)
3. Click "Create Space"
4. Choose region (e.g., NYC3)
5. Name: `tiervault` (or your choice)
6. Enable CDN
7. Select "Private" for file listing

### 2.2 Generate API Keys

1. Go to **API** section
2. Click **Spaces Keys**
3. Click "Generate New Key"
4. Name: "TierVault Backend"
5. Copy and save:
   - Access Key
   - Secret Key

## Step 3: Local Setup

### 3.1 Clone and Install Dependencies

```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-TierVault

# Install frontend dependencies
cd frontend
npm install

# Install functions dependencies
cd ../functions
npm install
```

### 3.2 Configure Environment Variables

Create `.env` file in project root:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Firebase Configuration (from Step 1.3)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=tiervault-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tiervault-prod
VITE_FIREBASE_STORAGE_BUCKET=tiervault-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Digital Ocean Spaces (from Step 2.2)
DO_SPACES_KEY=your_spaces_access_key
DO_SPACES_SECRET=your_spaces_secret_key
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
DO_SPACES_REGION=nyc3
DO_SPACES_BUCKET=tiervault

# App Config
VITE_APP_NAME=TierVault
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:5001
NODE_ENV=development
```

### 3.3 Configure Firebase Functions Environment

```bash
cd functions

# Set environment variables for Firebase Functions
firebase functions:config:set \
  spaces.key="your_spaces_access_key" \
  spaces.secret="your_spaces_secret_key" \
  spaces.endpoint="nyc3.digitaloceanspaces.com" \
  spaces.region="nyc3" \
  spaces.bucket="tiervault"
```

### 3.4 Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Select:
# - Firestore
# - Functions
# - Hosting

# Use existing project: select your project
```

### 3.5 Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## Step 4: Create Initial Tenant and Admin User

### 4.1 Create Tenant in Firestore

Go to Firebase Console > Firestore Database > Add document:

**Collection**: `tenants`
**Document ID**: (auto-generate)

```json
{
  "name": "Demo Company",
  "domain": "demo.tiervault.com",
  "settings": {
    "maxStorageGB": 10,
    "allowedFileTypes": ["pdf", "doc", "docx", "xls", "xlsx"],
    "retentionDays": 365
  },
  "isActive": true,
  "createdAt": (server timestamp),
  "updatedAt": (server timestamp)
}
```

Copy the generated Tenant ID.

### 4.2 Create Admin User

1. Go to Firebase Console > **Authentication**
2. Click "Add user"
3. Email: `admin@demo.com`
4. Password: `Admin123!` (change this!)
5. Copy the User UID

### 4.3 Add User Document to Firestore

Go to Firestore Database > Add document:

**Collection**: `users`
**Document ID**: (paste User UID from above)

```json
{
  "email": "admin@demo.com",
  "displayName": "Admin User",
  "tenantId": "paste_tenant_id_here",
  "role": "admin",
  "isActive": true,
  "lastLoginAt": null,
  "createdAt": (server timestamp),
  "updatedAt": (server timestamp)
}
```

## Step 5: Run Locally

### 5.1 Start Firebase Emulators (Optional)

```bash
# From project root
firebase emulators:start
```

This starts:
- Auth Emulator: http://localhost:9099
- Functions Emulator: http://localhost:5001
- Firestore Emulator: http://localhost:8080
- Hosting Emulator: http://localhost:5000
- Emulator UI: http://localhost:4000

### 5.2 Start Frontend (Development)

```bash
cd frontend
npm run dev
```

Frontend runs at: http://localhost:5173

### 5.3 Start Functions (Development)

```bash
cd functions
npm run serve
```

Functions run at: http://localhost:5001

## Step 6: Test the Application

1. Open http://localhost:5173
2. Login with: `admin@demo.com` / `Admin123!`
3. You should see the dashboard

## Step 7: Deploy to Production

### 7.1 Build Frontend

```bash
cd frontend
npm run build
```

### 7.2 Deploy Everything

```bash
# Deploy all
firebase deploy

# Or deploy individually:
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore
```

### 7.3 Access Production App

Your app will be live at: `https://tiervault-prod.web.app`

## Step 8: Post-Deployment Configuration

### 8.1 Custom Domain (Optional)

1. Go to Firebase Console > **Hosting**
2. Click "Add custom domain"
3. Follow DNS configuration steps

### 8.2 Enable CORS on Digital Ocean Spaces

1. Go to Digital Ocean Spaces settings
2. Add CORS configuration:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://tiervault-prod.web.app", "https://your-custom-domain.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 8.3 Monitor Usage

- Firebase Console > Functions > Logs
- Digital Ocean > Spaces > Usage
- Set up billing alerts

## Troubleshooting

### Issue: Functions deployment fails

**Solution**: Ensure you're on Blaze plan and environment variables are set

```bash
firebase functions:config:get
```

### Issue: CORS errors in frontend

**Solution**: Update Digital Ocean Spaces CORS settings (see 8.2)

### Issue: Authentication errors

**Solution**: Check Firebase Auth is enabled and `.env` variables are correct

### Issue: File upload fails

**Solution**: Verify Digital Ocean credentials in Functions config

```bash
firebase functions:config:get spaces
```

## Next Steps

1. ✅ Set up CI/CD with GitHub Actions
2. ✅ Add monitoring and error tracking (Sentry)
3. ✅ Implement backup strategy
4. ✅ Add SSL/TLS certificates for custom domain
5. ✅ Set up staging environment

## Support

For issues, contact: support@tiervault.com

## Security Checklist

- [ ] Change default admin password
- [ ] Enable 2FA for Firebase account
- [ ] Rotate Digital Ocean API keys regularly
- [ ] Set up Firestore backup
- [ ] Enable Firebase App Check
- [ ] Configure rate limiting
- [ ] Set up DDoS protection
- [ ] Review Firestore security rules
- [ ] Enable audit logging
- [ ] Set up alerts for suspicious activity
