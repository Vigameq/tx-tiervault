# Firebase Setup Checklist for TierVault

## ✅ Completed
- [x] Firebase project created: `tiervault-tx`
- [x] Firestore database created
- [x] Firestore security rules deployed
- [x] Firestore indexes deployed

## 🔧 Next Steps

### 1. Get Firebase Web App Configuration

1. Go to: https://console.firebase.google.com/project/tiervault-tx/settings/general
2. Scroll to "Your apps" section
3. If no web app exists:
   - Click **</>** (Web platform icon)
   - App nickname: `TierVault Web`
   - Check "Also set up Firebase Hosting"
   - Click "Register app"
4. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tiervault-tx.firebaseapp.com",
  projectId: "tiervault-tx",
  storageBucket: "tiervault-tx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 2. Enable Authentication

1. Go to: https://console.firebase.google.com/project/tiervault-tx/authentication
2. Click **Get started**
3. Click **Email/Password** under "Sign-in providers"
4. Toggle **Enable** ON
5. Click **Save**

### 3. Upgrade to Blaze Plan (Required for Cloud Functions)

**⚠️ IMPORTANT:** Firebase Functions require the Blaze (pay-as-you-go) plan

1. Go to: https://console.firebase.google.com/project/tiervault-tx/usage
2. Click **Modify plan**
3. Select **Blaze (Pay as you go)**
4. Add your billing information
5. **Set up budget alerts** to control costs:
   - Recommended: $25/month alert
   - This app should cost very little in development

**Cost Estimate:**
- Free tier includes: 2M function invocations, 10GB storage, 360MB/day transfer
- Typical dev usage: $0-5/month
- Production (small): $10-30/month

### 4. Create .env File

Once you have the Firebase config:

```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault
cp .env.example .env
nano .env  # or use your favorite editor
```

Fill in these values from Firebase Console:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=tiervault-tx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tiervault-tx
VITE_FIREBASE_STORAGE_BUCKET=tiervault-tx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
VITE_FIREBASE_APP_ID=your_actual_app_id
```

### 5. Set Up Digital Ocean Spaces (for File Storage)

#### 5.1 Create Spaces Bucket

1. Log in to: https://cloud.digitalocean.com
2. Click **Spaces** in the left menu
3. Click **Create Space**
4. Settings:
   - Region: Choose closest to you (e.g., NYC3, SFO3)
   - Name: `tiervault`
   - Enable CDN: Yes
   - File Listing: Private
5. Click **Create Space**

#### 5.2 Generate API Keys

1. Go to: https://cloud.digitalocean.com/account/api/spaces
2. Click **Generate New Key**
3. Name: `TierVault Backend`
4. Copy and save:
   - **Access Key**
   - **Secret Key** (only shown once!)

#### 5.3 Update .env File

Add Digital Ocean credentials to `.env`:

```env
DO_SPACES_KEY=your_actual_access_key
DO_SPACES_SECRET=your_actual_secret_key
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com  # Change to your region
DO_SPACES_REGION=nyc3  # Change to your region
DO_SPACES_BUCKET=tiervault
```

#### 5.4 Configure CORS (Important!)

1. In Digital Ocean Spaces, go to your bucket settings
2. Click **Settings** → **CORS Configurations**
3. Add this configuration:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:5173", "https://tiervault-tx.web.app"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 6. Configure Firebase Functions Environment

Set environment variables for Cloud Functions:

```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/functions

# Set Digital Ocean Spaces config
firebase functions:config:set \
  spaces.key="your_actual_access_key" \
  spaces.secret="your_actual_secret_key" \
  spaces.endpoint="nyc3.digitaloceanspaces.com" \
  spaces.region="nyc3" \
  spaces.bucket="tiervault"

# Verify configuration
firebase functions:config:get
```

### 7. Install Dependencies

```bash
# Frontend
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/frontend
npm install

# Backend
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/functions
npm install
```

### 8. Create Initial Tenant & Admin User

#### Option A: Using Firebase Console (Manual)

**Create Tenant:**
1. Go to: https://console.firebase.google.com/project/tiervault-tx/firestore
2. Click **+ Start collection**
3. Collection ID: `tenants`
4. Add document:

```json
{
  "name": "Demo Company",
  "domain": "demo.tiervault.com",
  "settings": {
    "maxStorageGB": 10,
    "allowedFileTypes": ["pdf", "doc", "docx", "xls", "xlsx", "txt", "jpg", "png"],
    "retentionDays": 365
  },
  "isActive": true,
  "createdAt": (Click "Add field" → Type: timestamp → Now),
  "updatedAt": (Click "Add field" → Type: timestamp → Now)
}
```

5. Copy the generated Document ID (this is your `tenantId`)

**Create Admin User in Auth:**
1. Go to: https://console.firebase.google.com/project/tiervault-tx/authentication/users
2. Click **Add user**
3. Email: `admin@tiervault.com`
4. Password: `TierVault123!` (change this!)
5. Copy the User UID

**Create User Document:**
1. Go back to Firestore
2. Create collection: `users`
3. Document ID: (paste the User UID from above)
4. Add fields:

```json
{
  "email": "admin@tiervault.com",
  "displayName": "Admin User",
  "tenantId": "paste_your_tenant_id_here",
  "role": "admin",
  "isActive": true,
  "lastLoginAt": null,
  "createdAt": (timestamp → Now),
  "updatedAt": (timestamp → Now)
}
```

#### Option B: Using Firebase Emulators (Recommended for Testing)

```bash
# Start emulators with seed data
firebase emulators:start --import=./firebase-data

# This will create test tenant and admin user automatically
```

### 9. Test Locally

**Terminal 1 - Start Emulators:**
```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault
firebase emulators:start
```

**Terminal 2 - Start Frontend:**
```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/frontend
npm run dev
```

**Terminal 3 - Build Functions (if needed):**
```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/functions
npm run build
```

### 10. Access the Application

- Frontend: http://localhost:5173
- Firebase Emulator UI: http://localhost:4000
- Functions: http://localhost:5001

**Test Login:**
- Email: `admin@tiervault.com`
- Password: `TierVault123!`

---

## 📋 Quick Reference

### Firebase Project Info
- **Project ID:** `tiervault-tx`
- **Console:** https://console.firebase.google.com/project/tiervault-tx
- **Hosting URL:** https://tiervault-tx.web.app (after deployment)

### Important URLs
- Firebase Console: https://console.firebase.google.com/project/tiervault-tx
- Firestore Database: https://console.firebase.google.com/project/tiervault-tx/firestore
- Authentication: https://console.firebase.google.com/project/tiervault-tx/authentication
- Functions: https://console.firebase.google.com/project/tiervault-tx/functions
- Hosting: https://console.firebase.google.com/project/tiervault-tx/hosting

### Useful Commands

```bash
# Login to Firebase
firebase login

# Check current project
firebase use

# View logs
firebase functions:log

# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# Start emulators
firebase emulators:start

# View function config
firebase functions:config:get
```

---

## ✅ Completion Checklist

- [ ] Got Firebase web app configuration
- [ ] Enabled Email/Password authentication
- [ ] Upgraded to Blaze plan
- [ ] Created .env file with Firebase config
- [ ] Created Digital Ocean Spaces bucket
- [ ] Generated Digital Ocean API keys
- [ ] Configured CORS on Spaces
- [ ] Updated .env with Digital Ocean config
- [ ] Set Firebase Functions config
- [ ] Installed frontend dependencies
- [ ] Installed backend dependencies
- [ ] Created tenant in Firestore
- [ ] Created admin user
- [ ] Tested local environment
- [ ] Successfully logged in

---

## 🆘 Troubleshooting

### "Missing or insufficient permissions"
- Check Firestore security rules are deployed
- Verify user has correct tenantId in Firestore

### "CORS error when uploading"
- Configure CORS on Digital Ocean Spaces (Step 5.4)

### "Functions not working"
- Ensure you're on Blaze plan
- Check functions config: `firebase functions:config:get`

### "Cannot connect to emulator"
- Make sure emulators are running: `firebase emulators:start`
- Check ports are not in use (4000, 5001, 8080, 9099)

---

**Need help?** Check the main SETUP.md or contact support.
