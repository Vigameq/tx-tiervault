# Complete TierVault Setup - Ready to Run! 🚀

## ✅ What's Already Configured

1. ✅ **Firebase Project**: `tiervault-tx` created
2. ✅ **Firestore Database**: Created with security rules deployed
3. ✅ **Firebase Web Config**: Added to `.env`
4. ✅ **Digital Ocean Spaces**: Partially configured (need secret key)
5. ✅ **Project Structure**: Complete codebase ready

---

## 🔧 Quick Setup Steps (Run These Commands)

### Step 1: Fix NPM Cache (if you see permission errors)

```bash
# Option A: Fix permissions (recommended)
sudo chown -R $(whoami) ~/.npm

# Option B: Use different cache location
export NPM_CONFIG_CACHE=~/.npm-cache-temp
```

### Step 2: Install Dependencies

```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../functions
npm install
```

### Step 3: Enable Firebase Authentication

1. Go to: https://console.firebase.google.com/project/tiervault-tx/authentication/providers
2. Click **Email/Password**
3. Toggle **Enable** ON
4. Click **Save**

### Step 4: Upgrade to Blaze Plan (Required for Cloud Functions)

⚠️ **IMPORTANT**: Cloud Functions require the Blaze plan

1. Go to: https://console.firebase.google.com/project/tiervault-tx/usage
2. Click **Modify plan**
3. Select **Blaze (Pay as you go)**
4. Add billing information
5. **Set budget alert**: $25/month (recommended)

**Expected costs:**
- Development: $0-5/month (within free tier)
- Production (small): $5-15/month

### Step 5: Add Digital Ocean Secret Key

You need to add the **Secret Access Key** to your `.env` files:

```bash
# Edit main .env
nano /Users/nithingangadhar/Documents/GitHub/tx-tiervault/.env
```

Find this line:
```
DO_SPACES_SECRET=your_secret_key_here
```

Replace with your actual secret key:
```
DO_SPACES_SECRET=your_actual_secret_key_from_digital_ocean
```

**Also update functions .env:**
```bash
nano /Users/nithingangadhar/Documents/GitHub/tx-tiervault/functions/.env
```

Same change as above.

**If you don't have the secret key:**
1. Go to: https://cloud.digitalocean.com/account/api/spaces
2. Delete old key
3. Generate new key
4. Copy both Access Key and Secret Key

### Step 6: Configure CORS on Digital Ocean Spaces

1. Go to: https://cloud.digitalocean.com/spaces/tiervault?i=c76f0e
2. Click **Settings** tab
3. Scroll to **CORS Configurations**
4. Add this configuration:

```json
{
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:5000",
    "https://tiervault-tx.web.app",
    "https://tiervault-tx.firebaseapp.com"
  ],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3000
}
```

### Step 7: Create Initial Tenant and Admin User

**Create Tenant in Firestore:**

1. Go to: https://console.firebase.google.com/project/tiervault-tx/firestore
2. Click **+ Start collection**
3. Collection ID: `tenants`
4. Click **Next**
5. Add document with these fields:

| Field | Type | Value |
|-------|------|-------|
| name | string | `Demo Company` |
| domain | string | `demo.tiervault.com` |
| isActive | boolean | `true` |
| createdAt | timestamp | (Click clock icon → Now) |
| updatedAt | timestamp | (Click clock icon → Now) |

6. Click **Add field** → **Map** → Field name: `settings`
7. Inside settings, add these fields:
   - `maxStorageGB` (number): `10`
   - `allowedFileTypes` (array): `["pdf", "doc", "docx", "xls", "xlsx", "txt", "jpg", "png"]`
   - `retentionDays` (number): `365`

8. Click **Save**
9. **Copy the Document ID** (this is your `tenantId`)

**Create Admin User in Authentication:**

1. Go to: https://console.firebase.google.com/project/tiervault-tx/authentication/users
2. Click **Add user**
3. Email: `admin@tiervault.com`
4. Password: `TierVault123!`
5. Click **Add user**
6. **Copy the User UID**

**Create User Document in Firestore:**

1. Go back to: https://console.firebase.google.com/project/tiervault-tx/firestore
2. Click **+ Start collection** (or add to existing)
3. Collection ID: `users`
4. Click **Next**
5. Document ID: (paste the User UID you copied)
6. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| email | string | `admin@tiervault.com` |
| displayName | string | `Admin User` |
| tenantId | string | (paste your tenant ID from step above) |
| role | string | `admin` |
| isActive | boolean | `true` |
| lastLoginAt | null | (leave as null) |
| createdAt | timestamp | (Now) |
| updatedAt | timestamp | (Now) |

7. Click **Save**

### Step 8: Start Local Development

Open **3 terminal windows**:

**Terminal 1 - Firebase Emulators (Optional for testing):**
```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault
firebase emulators:start
```

**Terminal 2 - Frontend:**
```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/frontend
npm run dev
```

**Terminal 3 - Watch Functions (for development):**
```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/functions
npm run watch
```

### Step 9: Access the Application

Open your browser:
- **Frontend**: http://localhost:5173
- **Firebase Emulator UI**: http://localhost:4000 (if running emulators)

**Login with:**
- Email: `admin@tiervault.com`
- Password: `TierVault123!`

---

## 🎯 Your Current Configuration

### Firebase Project
- **Project ID**: `tiervault-tx`
- **API Key**: `AIzaSyCyA8Buocap1uq2795o3bjPnNS0vbcOGJM`
- **Auth Domain**: `tiervault-tx.firebaseapp.com`
- **Storage Bucket**: `tiervault-tx.firebasestorage.app`
- **App ID**: `1:365489738851:web:5efcd46a97539aa2305456`

### Digital Ocean Spaces
- **Region**: Singapore (sgp1)
- **Bucket**: `tiervault`
- **Endpoint**: `sgp1.digitaloceanspaces.com`
- **Access Key**: `DO00DPTMC936A9MEK98V`
- **Secret Key**: ⚠️ **NEEDED**

---

## 📋 Setup Checklist

- [ ] Fix npm permissions
- [ ] Install frontend dependencies (`npm install`)
- [ ] Install functions dependencies (`npm install`)
- [ ] Enable Email/Password authentication in Firebase
- [ ] Upgrade to Blaze plan
- [ ] Add Digital Ocean Secret Key to `.env` files
- [ ] Configure CORS on Digital Ocean Spaces
- [ ] Create tenant in Firestore
- [ ] Create admin user in Firebase Auth
- [ ] Create user document in Firestore
- [ ] Start frontend dev server
- [ ] Test login
- [ ] Test file upload

---

## 🆘 Troubleshooting

### NPM Permission Errors
```bash
sudo chown -R $(whoami) ~/.npm
```

### Firebase CLI Not Found
```bash
npm install -g firebase-tools
firebase login
```

### Port Already in Use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Kill process on port 5001
lsof -ti:5001 | xargs kill -9
```

### "Missing or insufficient permissions" in Firestore
- Make sure user document has correct `tenantId`
- Check security rules are deployed: `firebase deploy --only firestore:rules`

### File Upload Fails
- Check Digital Ocean Secret Key is correct
- Verify CORS is configured
- Check bucket name and region match

---

## 🚀 After Setup is Complete

Once everything is working, you can:

1. **Deploy to Production**
   ```bash
   firebase deploy
   ```

2. **Start Building Features**
   - Document upload UI
   - Folder management
   - Version history
   - User management
   - Dashboard with analytics

3. **Invite Team Members**
   - Create users via Auth API
   - Assign roles (admin, manager, editor, viewer)

---

## 📞 Need Help?

Common issues and solutions:
- FIREBASE_SETUP.md - Detailed Firebase setup
- DO_SPACES_SETUP.md - Digital Ocean Spaces setup
- ARCHITECTURE.md - System architecture
- QUICKSTART.md - Quick start guide

**Ready to start building? Run the commands above and let me know if you hit any issues!**
