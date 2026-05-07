# 🎉 TierVault Setup - ALMOST COMPLETE!

**Date**: May 4, 2026
**Status**: ✅ Core Setup Complete - Ready for Initial Data

---

## ✅ COMPLETED SUCCESSFULLY

### 1. Firebase Configuration ✅
- ✅ Project created: `tiervault-tx`
- ✅ Web app registered
- ✅ Firestore database created and configured
- ✅ Security rules deployed
- ✅ Database indexes deployed
- ✅ **Authentication enabled** (Email/Password)
- ✅ **Blaze plan active** (Cloud Functions enabled)

### 2. Digital Ocean Spaces ✅
- ✅ Bucket created: `tiervault` (Singapore region)
- ✅ Access Key configured: `DO007AVVEFAK2UGRH7A2`
- ✅ Secret Key configured: ✅ Verified working
- ✅ **Connection tested successfully**
- ✅ Test file uploaded successfully
- ✅ Signed URLs working

### 3. Dependencies ✅
- ✅ Frontend dependencies installed (399 packages)
- ✅ Backend dependencies installed (400 packages)
- ✅ No critical errors

### 4. Development Server ✅
- ✅ Frontend server running: **http://localhost:5173**
- ✅ Application accessible
- ✅ React app loading correctly

---

## ⏳ REMAINING STEPS (Quick - 10 minutes)

### Step 1: Configure CORS on Digital Ocean Spaces

**Why**: Allows your frontend to upload files to Spaces

**How**:
1. Go to: https://cloud.digitalocean.com/spaces/tiervault
2. Click **Settings** tab
3. Scroll to **CORS Configurations**
4. Click **Add** or **Edit**
5. Paste this configuration:

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

### Step 2: Create Tenant in Firestore

**Why**: Multi-tenant system - need at least one tenant

**How**:
1. Go to: https://console.firebase.google.com/project/tiervault-tx/firestore/data
2. Click **+ Start collection**
3. Collection ID: `tenants`
4. Click **Next**
5. Document ID: **Auto-generate** (or use custom like `tenant-demo`)
6. Add these fields:

| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Demo Company` |
| `domain` | string | `demo.tiervault.com` |
| `isActive` | boolean | `true` |
| `createdAt` | timestamp | (click clock icon → select "Now") |
| `updatedAt` | timestamp | (click clock icon → select "Now") |

7. Add a **Map** field called `settings`:
   - Click **+ Add field** → **Type**: map → **Field name**: `settings`
   - Inside `settings`, add:
     - `maxStorageGB` (number): `10`
     - `retentionDays` (number): `365`
     - `allowedFileTypes` (array): Click **+** to add each:
       - `pdf`
       - `doc`
       - `docx`
       - `xls`
       - `xlsx`
       - `txt`
       - `jpg`
       - `png`

8. Click **Save**
9. **COPY THE DOCUMENT ID** - you'll need this next!

---

### Step 3: Create Admin User in Firebase Authentication

**Why**: You need credentials to login

**How**:
1. Go to: https://console.firebase.google.com/project/tiervault-tx/authentication/users
2. Click **Add user**
3. Fill in:
   - **Email**: `admin@tiervault.com`
   - **Password**: `TierVault123!` (or choose your own)
4. Click **Add user**
5. **COPY THE USER UID** from the user list (long string like `abc123xyz...`)

---

### Step 4: Create User Document in Firestore

**Why**: Links Firebase Auth user to your tenant

**How**:
1. Go back to: https://console.firebase.google.com/project/tiervault-tx/firestore/data
2. Click **+ Start collection** (or find existing `users` collection)
3. Collection ID: `users`
4. Click **Next**
5. **Document ID**: **PASTE THE USER UID FROM STEP 3**
6. Add these fields:

| Field Name | Type | Value |
|------------|------|-------|
| `email` | string | `admin@tiervault.com` |
| `displayName` | string | `Admin User` |
| `tenantId` | string | **PASTE TENANT ID FROM STEP 2** |
| `role` | string | `admin` |
| `isActive` | boolean | `true` |
| `lastLoginAt` | null | (leave as null) |
| `createdAt` | timestamp | (Now) |
| `updatedAt` | timestamp | (Now) |

7. Click **Save**

---

## 🚀 TESTING YOUR APPLICATION

Once the above steps are complete:

### 1. Access the Application

Open your browser: **http://localhost:5173**

You should see the login page!

### 2. Login

- **Email**: `admin@tiervault.com`
- **Password**: `TierVault123!` (or whatever you chose)

### 3. Expected Result

✅ You should be logged in and see the dashboard!

---

## 📊 Your Complete Configuration

### Firebase
- **Project**: `tiervault-tx`
- **Console**: https://console.firebase.google.com/project/tiervault-tx
- **App URL**: https://tiervault-tx.web.app (after deployment)
- **Auth**: Email/Password enabled ✅
- **Plan**: Blaze (Pay as you go) ✅

### Digital Ocean Spaces
- **Bucket**: `tiervault`
- **Region**: Singapore (sgp1)
- **Endpoint**: `sgp1.digitaloceanspaces.com`
- **Access Key**: `DO007AVVEFAK2UGRH7A2` ✅
- **Connection**: Tested and working ✅

### Local Development
- **Frontend**: http://localhost:5173 ✅ Running
- **Emulator UI**: http://localhost:4000 (if you start emulators)

---

## 🎯 After Login Success - What's Next?

Once you can login successfully, we'll start building features:

### Phase 1: Document Upload (Week 1)
- [ ] Build drag-and-drop upload UI
- [ ] Implement file upload to Spaces
- [ ] Display uploaded documents
- [ ] Show file details (name, size, date)

### Phase 2: Folder Management (Week 1-2)
- [ ] Create folder tree navigation
- [ ] Add/rename/delete folders
- [ ] Move documents between folders

### Phase 3: Version Control (Week 2)
- [ ] Upload new versions
- [ ] Show version history
- [ ] Compare versions (checksum)
- [ ] Download specific versions

### Phase 4: UI Polish (Week 3)
- [ ] Dashboard with analytics
- [ ] Search and filters
- [ ] Beautiful document cards
- [ ] Mobile responsive design

---

## 🆘 Troubleshooting

### Can't login?
- Check user document has correct `tenantId`
- Check `role` is set to `admin`
- Check Firebase Auth has the user

### CORS error when uploading?
- Make sure CORS is configured on Spaces (Step 1 above)

### "Missing or insufficient permissions"?
- Check Firestore security rules are deployed
- Check user document exists in Firestore

---

## 📞 Quick Commands Reference

```bash
# Start frontend (if not running)
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/frontend
npm run dev

# Start Firebase emulators (for testing)
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault
firebase emulators:start

# Build frontend for production
cd frontend
npm run build

# Deploy to Firebase
firebase deploy

# View Firebase logs
firebase functions:log
```

---

## ✅ Setup Checklist - Final

- [x] Firebase project created
- [x] Firebase web app configured
- [x] Firestore database created
- [x] Security rules deployed
- [x] Firebase Authentication enabled
- [x] Blaze plan activated
- [x] Digital Ocean Spaces configured
- [x] Spaces connection tested
- [x] Dependencies installed
- [x] Frontend server running
- [ ] CORS configured (Step 1 above)
- [ ] Tenant created (Step 2 above)
- [ ] Admin user created (Step 3 above)
- [ ] User document created (Step 4 above)
- [ ] Login tested successfully

---

## 🎉 You're Almost There!

Complete the 4 steps above (takes about 10 minutes), then you can:
1. ✅ Login to TierVault
2. ✅ Start building features
3. ✅ Deploy to production

**The hardest part is done! Just 4 more steps and you're ready to go! 🚀**

---

**Questions or issues?** Check the documentation files:
- [COMPLETE_SETUP.md](./COMPLETE_SETUP.md)
- [VALIDATION_REPORT.md](./VALIDATION_REPORT.md)
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- [DO_SPACES_SETUP.md](./DO_SPACES_SETUP.md)
