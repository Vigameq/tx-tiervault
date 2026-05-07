# TierVault Setup Validation Report

**Date**: May 4, 2026
**Project**: tiervault-tx

---

## ✅ Validated & Working

### 1. Firebase Project Configuration
- ✅ **Project ID**: `tiervault-tx`
- ✅ **Project accessible** via Firebase CLI
- ✅ **Web app created**: `tiervault` (ID: 1:365489738851:web:5efcd46a97539aa2305456)

### 2. Firebase Configuration in .env
- ✅ **API Key**: Configured (`AIzaSyCyA8Buocap1uq2795o3bjPnNS0vbcOGJM`)
- ✅ **Auth Domain**: `tiervault-tx.firebaseapp.com`
- ✅ **Project ID**: `tiervault-tx`
- ✅ **Storage Bucket**: `tiervault-tx.firebasestorage.app`
- ✅ **Messaging Sender ID**: `365489738851`
- ✅ **App ID**: Configured
- ✅ **Measurement ID**: `G-YJFKLLEHL0`

### 3. Firestore Database
- ✅ **Database created**: Default database exists
- ✅ **Security rules**: Deployed successfully
- ✅ **Indexes**: Deployed successfully
- ✅ **Rules file**: `firestore.rules` present
- ✅ **Indexes file**: `firestore.indexes.json` present

### 4. Digital Ocean Spaces (Partial)
- ✅ **Region**: Singapore (sgp1)
- ✅ **Bucket**: `tiervault`
- ✅ **Endpoint**: `sgp1.digitaloceanspaces.com`
- ✅ **Access Key**: Configured (`DO00DPTMC936A9MEK98V`)

### 5. Project Structure
- ✅ All source files present
- ✅ Frontend structure complete
- ✅ Functions structure complete
- ✅ Configuration files present

---

## ⚠️ Pending Items

### 1. Digital Ocean Secret Key
**Status**: ⚠️ **Not configured** (still has placeholder)

**Action Required**:
```bash
# Edit .env file
nano /Users/nithingangadhar/Documents/GitHub/tx-tiervault/.env

# Find this line:
DO_SPACES_SECRET=your_secret_key_here

# Replace with actual secret key from Digital Ocean
```

**How to get it**:
1. Go to: https://cloud.digitalocean.com/account/api/spaces
2. Find your key or generate a new one
3. Copy the Secret Access Key

---

### 2. Dependencies Installation
**Status**: ⚠️ **Not installed**

**Issue**: NPM cache permission error preventing installation

**Solution**:
```bash
# Fix npm cache permissions
sudo chown -R $(whoami) ~/.npm

# Then install
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/frontend
npm install

cd ../functions
npm install
```

**Alternative** (if permission fix doesn't work):
```bash
# Use sudo (not recommended but works)
cd frontend
sudo npm install --unsafe-perm

cd ../functions
sudo npm install --unsafe-perm
```

---

### 3. Firebase Authentication Status
**Status**: ⏳ **You said it's enabled - needs verification**

**To Verify**:
1. Go to: https://console.firebase.google.com/project/tiervault-tx/authentication/providers
2. Check if **Email/Password** shows as "Enabled"
3. Should show a green checkmark ✅

**If not enabled**:
1. Click on "Email/Password"
2. Toggle "Enable" to ON
3. Click "Save"

---

### 4. Blaze Plan Status
**Status**: ⏳ **You said it's enabled - needs verification**

**To Verify**:
1. Go to: https://console.firebase.google.com/project/tiervault-tx/usage
2. Should show: **"Blaze (Pay as you go)"**
3. NOT "Spark (Free)"

**If still on Spark plan**:
1. Click "Modify plan"
2. Select "Blaze"
3. Add billing information
4. Set budget alert ($25/month recommended)

---

### 5. Initial Data (Tenant & Admin User)
**Status**: ❌ **Not created yet**

**Action Required**: Follow these steps carefully

#### Step 1: Create Tenant

1. Go to: https://console.firebase.google.com/project/tiervault-tx/firestore/data
2. Click **+ Start collection**
3. Collection ID: `tenants`
4. Click **Next**
5. Document ID: (Auto-generate or use custom)
6. Add these fields exactly:

```
name: (string) "Demo Company"
domain: (string) "demo.tiervault.com"
isActive: (boolean) true
createdAt: (timestamp) [Click clock icon → Now]
updatedAt: (timestamp) [Click clock icon → Now]
settings: (map)
  ├─ maxStorageGB: (number) 10
  ├─ allowedFileTypes: (array)
  │   ├─ [0]: "pdf"
  │   ├─ [1]: "doc"
  │   ├─ [2]: "docx"
  │   ├─ [3]: "xls"
  │   ├─ [4]: "xlsx"
  │   ├─ [5]: "txt"
  │   ├─ [6]: "jpg"
  │   └─ [7]: "png"
  └─ retentionDays: (number) 365
```

7. Click **Save**
8. **IMPORTANT**: Copy the Document ID (this is your `tenantId`)

#### Step 2: Create Admin User in Authentication

1. Go to: https://console.firebase.google.com/project/tiervault-tx/authentication/users
2. Click **Add user**
3. Email: `admin@tiervault.com`
4. Password: `TierVault123!` (or your preferred password)
5. Click **Add user**
6. **IMPORTANT**: Copy the **User UID** from the list

#### Step 3: Create User Document in Firestore

1. Go back to: https://console.firebase.google.com/project/tiervault-tx/firestore/data
2. Find or create collection: `users`
3. Click **+ Add document**
4. Document ID: (Paste the User UID from Step 2)
5. Add these fields:

```
email: (string) "admin@tiervault.com"
displayName: (string) "Admin User"
tenantId: (string) [PASTE YOUR TENANT ID FROM STEP 1]
role: (string) "admin"
isActive: (boolean) true
lastLoginAt: (null) null
createdAt: (timestamp) [Now]
updatedAt: (timestamp) [Now]
```

6. Click **Save**

---

### 6. CORS Configuration on Digital Ocean Spaces
**Status**: ❌ **Not configured**

**Action Required**:
1. Go to: https://cloud.digitalocean.com/spaces/tiervault
2. Click **Settings** tab
3. Scroll to **CORS Configurations**
4. Click **Add** or **Edit**
5. Add this configuration:

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

6. Click **Save**

---

## 📋 Complete Setup Checklist

### Firebase Setup
- [x] Firebase project created
- [x] Web app registered
- [x] Firestore database created
- [x] Security rules deployed
- [x] Database indexes deployed
- [x] Firebase config added to .env
- [ ] Authentication enabled (verify)
- [ ] Blaze plan enabled (verify)

### Digital Ocean Spaces
- [x] Bucket created
- [x] Access key configured
- [ ] Secret key configured
- [ ] CORS configured

### Application Setup
- [x] Project structure created
- [x] Configuration files present
- [ ] Dependencies installed (frontend)
- [ ] Dependencies installed (functions)

### Initial Data
- [ ] Tenant created in Firestore
- [ ] Admin user created in Auth
- [ ] User document created in Firestore

### Testing
- [ ] Dependencies installed successfully
- [ ] Frontend starts without errors
- [ ] Can login with admin credentials
- [ ] Can upload a file
- [ ] File appears in Digital Ocean Spaces

---

## 🚀 Next Commands to Run

Once you complete the pending items above:

```bash
# 1. Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# 2. Install dependencies
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/frontend
npm install

cd ../functions
npm install

# 3. Start development
# Terminal 1:
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/frontend
npm run dev

# Terminal 2 (optional - for testing):
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault
firebase emulators:start
```

---

## 📞 Verification URLs

After setup, verify these URLs work:

1. **Firebase Console**: https://console.firebase.google.com/project/tiervault-tx
2. **Authentication**: https://console.firebase.google.com/project/tiervault-tx/authentication
3. **Firestore**: https://console.firebase.google.com/project/tiervault-tx/firestore
4. **Usage (Blaze Plan)**: https://console.firebase.google.com/project/tiervault-tx/usage
5. **Digital Ocean Spaces**: https://cloud.digitalocean.com/spaces/tiervault
6. **Local Frontend** (after npm run dev): http://localhost:5173

---

## ✅ What to Tell Me

Please confirm or provide:

1. **Firebase Authentication**: Is Email/Password enabled?
   - Visit: https://console.firebase.google.com/project/tiervault-tx/authentication/providers
   - Screenshot or confirm: "Enabled" ✅

2. **Blaze Plan**: Is it active?
   - Visit: https://console.firebase.google.com/project/tiervault-tx/usage
   - Should show: "Blaze (Pay as you go)"
   - Screenshot or confirm: Active ✅

3. **Digital Ocean Secret Key**: Do you have it?
   - If yes, I'll update the .env file
   - If no, generate a new key pair

4. **NPM Issues**: Can you run `sudo chown -R $(whoami) ~/.npm`?
   - This will fix the permission issues

Once you confirm these, I'll help you with the final setup steps!

---

**Generated**: May 4, 2026
**Last Updated**: After initial validation
