# TierVault Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Variables
- [ ] Verify all Firebase environment variables are set correctly in frontend
- [ ] Check AWS S3 credentials are configured in backend `.env`
- [ ] Confirm API base URL points to production functions URL

### 2. Security
- [x] Firestore security rules are in place
- [x] Authentication required for all protected routes
- [x] Auto-logout after 20 minutes of inactivity
- [x] Role-based access control (RBAC) implemented
- [x] Tenant isolation enforced in backend
- [ ] **RECOMMENDED**: Enable Firebase App Check to prevent abuse
- [ ] **RECOMMENDED**: Set up Cloud Armor or rate limiting

### 3. Database
- [x] Firestore indexes deployed (auditLogs, comments)
- [x] Security rules tested and deployed
- [ ] **RECOMMENDED**: Set up automated Firestore backups

### 4. Performance & Monitoring
- [ ] **CRITICAL**: Set up error monitoring (Sentry, Firebase Crashlytics, or similar)
- [ ] **CRITICAL**: Enable Firebase Performance Monitoring
- [ ] **RECOMMENDED**: Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] **RECOMMENDED**: Configure Cloud Logging alerts for errors
- [ ] Review and optimize bundle size (current: 882KB main chunk)

### 5. Storage
- [x] AWS S3 bucket configured for document storage
- [ ] **RECOMMENDED**: Set up S3 lifecycle policies for old versions
- [ ] **RECOMMENDED**: Enable S3 versioning and backup
- [ ] Verify CORS settings on S3 bucket

### 6. Testing
- [ ] Test all user roles (admin, manager, editor, viewer, supplier)
- [ ] Test document upload/download/versioning
- [ ] Test folder sharing with suppliers
- [ ] Test auto-logout functionality
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Load test with concurrent users (recommended: 50+ users)

### 7. Documentation
- [x] User roles and permissions documented
- [x] API endpoints documented (in code comments)
- [ ] **RECOMMENDED**: Create user guide/manual
- [ ] **RECOMMENDED**: Document deployment process

### 8. Backup & Recovery
- [ ] **CRITICAL**: Set up automated Firestore backups (daily recommended)
- [ ] **CRITICAL**: Test restore procedure from backup
- [ ] **RECOMMENDED**: Document disaster recovery plan
- [ ] **RECOMMENDED**: S3 bucket versioning enabled

### 9. Known Issues to Address
- [ ] Large bundle size warning (882KB) - consider code splitting
- [ ] Node.js 20 runtime deprecated - plan upgrade to Node.js 22
- [ ] firebase-functions package outdated - plan upgrade
- [ ] AWS SDK v2 deprecated - migrate to AWS SDK v3

### 10. Post-Deployment
- [ ] Monitor error logs for first 24 hours
- [ ] Check performance metrics
- [ ] Verify email notifications work (if implemented)
- [ ] Test with real users in production
- [ ] Create rollback plan

---

## 🚀 Deployment Commands

### Full Deployment
```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault
firebase deploy
```

### Backend Only
```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/functions
npm run deploy
```

### Frontend Only
```bash
cd /Users/nithingangadhar/Documents/GitHub/tx-tiervault/frontend
npm run build
cd ..
firebase deploy --only hosting
```

### Database Rules Only
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## ⚠️ Critical Production Recommendations

### 1. Error Monitoring (HIGH PRIORITY)
Install Sentry for error tracking:
```bash
cd frontend
npm install @sentry/react
```

### 2. Performance Monitoring
Enable Firebase Performance Monitoring in console:
https://console.firebase.google.com/project/tiervault-tx/performance

### 3. Firestore Backups
Set up automated backups:
```bash
gcloud firestore export gs://[BUCKET_NAME]
```

### 4. Rate Limiting
Consider implementing rate limiting on Cloud Functions to prevent abuse:
- Document uploads: 10 requests/minute per user
- API calls: 100 requests/minute per user

### 5. Cost Monitoring
- Set up billing alerts in Google Cloud Console
- Monitor Cloud Functions invocations
- Monitor Firestore reads/writes
- Monitor S3 storage and bandwidth

---

## 📊 Current Application Status

**Deployed URLs:**
- Frontend: https://tiervault-tx.web.app
- API: https://us-central1-tiervault-tx.cloudfunctions.net/api

**Versions:**
- Node.js: 20 (deprecated, upgrade recommended)
- Firebase Functions: v4 (outdated)
- React: Latest (via Vite)

**Features Implemented:**
✅ Document upload/download with versioning
✅ Folder-based organization with sharing
✅ Role-based access control (5 roles)
✅ Multi-tenant architecture
✅ Comments and activity tracking
✅ Dashboard analytics
✅ User management (admin only)
✅ Settings page with preferences
✅ Auto-logout on inactivity (20 min)
✅ Folder sharing indicators

**Known Limitations:**
- No email notifications yet
- No document preview for all file types
- No bulk operations
- No document search across content (only by name)
- No trash/recycle bin (deleted items are permanent)

---

## 🔐 Security Best Practices

1. **Enable 2FA** for admin accounts (Firebase console)
2. **Review Firestore rules** periodically
3. **Rotate AWS credentials** every 90 days
4. **Monitor audit logs** for suspicious activity
5. **Keep dependencies updated** for security patches
6. **Use HTTPS only** (already enforced by Firebase)
7. **Sanitize user inputs** (currently handled)

---

## 📈 Scalability Considerations

**Current Limits:**
- Firestore: 1 million documents free, then pay-as-you-go
- Cloud Functions: 2 million invocations/month free
- Cloud Storage: 5GB free, then pay-as-you-go
- Authentication: Unlimited users

**Recommended Upgrades for >1000 Users:**
1. Implement Cloud CDN for static assets
2. Use Cloud Storage instead of S3 (better Firebase integration)
3. Implement caching with Cloud Memorystore
4. Enable auto-scaling on Cloud Functions
5. Consider Firebase App Hosting (beta) for better performance

---

## 🐛 Troubleshooting Common Issues

**Issue: Users logged out unexpectedly**
- Check auto-logout timer (currently 20 min)
- Verify Firebase Auth session persistence

**Issue: Documents fail to upload**
- Check S3 bucket permissions
- Verify AWS credentials in backend `.env`
- Check file size limits

**Issue: Slow performance**
- Check Firestore indexes are deployed
- Review Cloud Functions cold start times
- Consider increasing function memory allocation

**Issue: Sharing not working**
- Verify user has supplier role
- Check assignedFolders array in Firestore
- Refresh page after sharing

---

## 📞 Support & Maintenance

**Regular Maintenance Tasks:**
- Weekly: Review error logs
- Monthly: Check storage usage and costs
- Quarterly: Update dependencies
- Yearly: Security audit and penetration testing

**Monitoring Dashboards:**
- Firebase Console: https://console.firebase.google.com/project/tiervault-tx
- Google Cloud Console: https://console.cloud.google.com
- AWS S3 Console: https://s3.console.aws.amazon.com

---

Generated: 2026-05-08
Last Updated: 2026-05-08
