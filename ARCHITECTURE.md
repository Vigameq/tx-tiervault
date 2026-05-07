# TierVault Architecture

## System Overview

TierVault is a multi-tenant SaaS document management system with intelligent version control, built on a serverless architecture using Firebase and Digital Ocean Spaces.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript + Vite                        │   │
│  │  - TailwindCSS UI                                     │   │
│  │  - React Query (API state)                           │   │
│  │  - Zustand (Client state)                            │   │
│  │  - React Router (Navigation)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Firebase Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Firebase     │  │ Firebase     │  │ Firebase     │      │
│  │ Hosting      │  │ Auth         │  │ Functions    │      │
│  │              │  │              │  │              │      │
│  │ Static Files │  │ JWT Tokens   │  │ REST API     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│     Firestore DB         │  │  Digital Ocean Spaces     │
│                          │  │                           │
│  - Tenants               │  │  - Document Files         │
│  - Users                 │  │  - Version History        │
│  - Documents Metadata    │  │  - S3-Compatible API      │
│  - Folders               │  │  - CDN Distribution       │
│  - Versions              │  │                           │
│  - Audit Logs            │  │  Storage Structure:       │
│                          │  │  {tenantId}/              │
│  Multi-tenant Data       │  │    {documentId}/          │
│  Isolation               │  │      {versionId}/         │
│                          │  │        filename.ext       │
└──────────────────────────┘  └──────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: 
  - Zustand (client state)
  - React Query (server state)
- **Routing**: React Router v6
- **Form Handling**: React Hook Form + Zod
- **UI Components**: Custom components with TailwindCSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Notifications**: Sonner

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Platform**: Firebase Functions (Cloud Functions)
- **Language**: TypeScript
- **Authentication**: Firebase Auth (JWT)
- **Database**: Firestore (NoSQL)
- **File Storage**: Digital Ocean Spaces (S3-compatible)
- **File Upload**: Busboy (multipart/form-data)

### Infrastructure
- **Hosting**: Firebase Hosting (CDN + SSL)
- **Serverless**: Firebase Functions (auto-scaling)
- **Database**: Firestore (managed NoSQL)
- **Storage**: Digital Ocean Spaces (object storage)
- **CDN**: Built-in with Spaces and Firebase Hosting

## Data Models

### Tenant
```typescript
{
  id: string
  name: string
  domain: string
  settings: {
    maxStorageGB: number
    allowedFileTypes: string[]
    retentionDays: number
  }
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### User
```typescript
{
  id: string
  email: string
  displayName: string
  tenantId: string
  role: 'admin' | 'manager' | 'editor' | 'viewer'
  isActive: boolean
  lastLoginAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Document
```typescript
{
  id: string
  tenantId: string
  name: string
  type: string
  size: number
  folderId: string | null
  currentVersion: string  // e.g., "2.1.3"
  latestVersionId: string
  metadata: {
    tags: string[]
    category: string
    customFields: Record<string, any>
  }
  permissions: Permission[]
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### DocumentVersion
```typescript
{
  id: string
  documentId: string
  version: string  // Semantic versioning
  fileUrl: string
  fileKey: string  // Path in Spaces
  size: number
  checksum: string  // SHA-256
  comment: string
  changeType: 'created' | 'updated' | 'restored'
  changedBy: string
  createdAt: Timestamp
}
```

### Folder
```typescript
{
  id: string
  tenantId: string
  name: string
  parentId: string | null
  path: string  // e.g., "Documents/Legal/Contracts"
  permissions: Permission[]
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### AuditLog
```typescript
{
  id: string
  tenantId: string
  userId: string
  action: 'upload' | 'download' | 'delete' | 'share' | 'update' | 'view'
  resourceType: 'document' | 'folder' | 'user'
  resourceId: string
  metadata: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Timestamp
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user (admin/manager only)
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/login` - Record login timestamp

### Documents
- `POST /api/documents/upload` - Upload new document
- `POST /api/documents/:documentId/versions` - Upload new version
- `GET /api/documents` - List all documents (with filters)
- `GET /api/documents/:documentId` - Get document by ID
- `GET /api/documents/:documentId/versions` - Get version history
- `GET /api/documents/:documentId/download` - Get download URL
- `DELETE /api/documents/:documentId` - Delete document (soft delete)

### Folders
- `POST /api/folders` - Create new folder
- `GET /api/folders` - List folders (with parent filter)
- `GET /api/folders/:folderId` - Get folder by ID
- `PUT /api/folders/:folderId` - Update folder
- `DELETE /api/folders/:folderId` - Delete folder

### Tenants
- `GET /api/tenants/current` - Get current tenant info
- `PUT /api/tenants/settings` - Update tenant settings (admin only)
- `GET /api/tenants/storage-usage` - Get storage usage stats

### Users
- `GET /api/users` - List all users (admin/manager)
- `GET /api/users/:userId` - Get user by ID
- `PUT /api/users/:userId/role` - Update user role (admin only)
- `PUT /api/users/:userId/deactivate` - Deactivate user (admin only)
- `PUT /api/users/:userId/activate` - Activate user (admin only)

## Security Architecture

### Multi-Tenant Isolation

1. **Data Segregation**: Every document in Firestore has a `tenantId` field
2. **Row-Level Security**: Firestore rules enforce tenant isolation
3. **API Validation**: All endpoints verify `tenantId` matches authenticated user
4. **File Storage**: Files stored in tenant-specific paths: `{tenantId}/{documentId}/{versionId}/`

### Authentication Flow

```
1. User enters email/password
   ↓
2. Firebase Auth validates credentials
   ↓
3. Frontend receives JWT token
   ↓
4. Token stored in local storage
   ↓
5. Token sent in Authorization header: "Bearer {token}"
   ↓
6. Backend verifies token with Firebase Admin SDK
   ↓
7. User data fetched from Firestore
   ↓
8. Request processed with user context
```

### Authorization (RBAC)

| Role    | Create | Read | Update | Delete | Manage Users | Admin Settings |
|---------|--------|------|--------|--------|--------------|----------------|
| Viewer  | ❌     | ✅   | ❌     | ❌     | ❌           | ❌             |
| Editor  | ✅     | ✅   | ✅     | Own    | ❌           | ❌             |
| Manager | ✅     | ✅   | ✅     | ✅     | ✅           | ❌             |
| Admin   | ✅     | ✅   | ✅     | ✅     | ✅           | ✅             |

### Firestore Security Rules

- Users can only access data from their tenant
- Document owners can delete their documents
- Admins have full access within their tenant
- Audit logs are write-only (except for admins)
- Soft deletes prevent accidental data loss

## Version Control System

### Intelligent Versioning

1. **Upload**: User uploads a file
2. **Checksum**: Calculate SHA-256 hash
3. **Compare**: Compare with latest version's checksum
4. **Decision**:
   - If checksums match → Reject (no changes)
   - If checksums differ → Create new version
5. **Storage**: Upload to Digital Ocean Spaces
6. **Metadata**: Store version info in Firestore
7. **Version Bump**: Increment version number (semantic versioning)

### Semantic Versioning

- **Format**: `MAJOR.MINOR.PATCH` (e.g., `2.3.5`)
- **Initial**: `1.0.0`
- **Patch**: Auto-increment for updates (`1.0.0` → `1.0.1`)
- **Minor**: Manual bump for features (`1.0.5` → `1.1.0`)
- **Major**: Manual bump for breaking changes (`1.9.3` → `2.0.0`)

### File Comparison

```typescript
// SHA-256 checksum comparison
const currentChecksum = calculateChecksum(newFile)
const previousChecksum = latestVersion.checksum

if (currentChecksum === previousChecksum) {
  throw new Error('No changes detected')
}

// Create new version
const newVersion = getNextVersion(currentVersion) // 1.0.0 → 1.0.1
```

## File Storage Architecture

### Digital Ocean Spaces Structure

```
tiervault-bucket/
├── tenant-abc123/
│   ├── doc-xyz789/
│   │   ├── ver-001/
│   │   │   └── contract.pdf (v1.0.0)
│   │   ├── ver-002/
│   │   │   └── contract.pdf (v1.0.1)
│   │   └── ver-003/
│   │       └── contract.pdf (v2.0.0)
│   └── doc-def456/
│       └── ver-001/
│           └── invoice.xlsx
└── tenant-def456/
    └── doc-ghi789/
        └── ver-001/
            └── report.docx
```

### File Upload Flow

```
1. Frontend: User selects file
   ↓
2. Frontend: Send multipart/form-data to API
   ↓
3. Backend: Parse file with Busboy
   ↓
4. Backend: Validate file type & size
   ↓
5. Backend: Calculate checksum
   ↓
6. Backend: Compare with existing versions
   ↓
7. Backend: Upload to Spaces (S3 API)
   ↓
8. Backend: Store metadata in Firestore
   ↓
9. Backend: Create audit log entry
   ↓
10. Frontend: Show success notification
```

### File Download Flow

```
1. User clicks download button
   ↓
2. Frontend: Request signed URL from API
   ↓
3. Backend: Verify user permissions
   ↓
4. Backend: Generate temporary signed URL (1 hour expiry)
   ↓
5. Backend: Log download in audit logs
   ↓
6. Frontend: Redirect to signed URL
   ↓
7. Browser: Download file directly from Spaces
```

## Scalability

### Horizontal Scaling
- **Firebase Functions**: Auto-scales based on load
- **Firestore**: Automatically scales to millions of documents
- **Digital Ocean Spaces**: Unlimited object storage
- **CDN**: Global distribution for fast downloads

### Performance Optimization
- **Firestore Indexes**: Optimized queries for fast reads
- **Connection Pooling**: Reuse database connections
- **Caching**: Frontend caching with React Query
- **Lazy Loading**: Code splitting with React.lazy()
- **Image Optimization**: CDN-based compression
- **Pagination**: Cursor-based pagination for large datasets

### Cost Optimization
- **Pay-as-you-go**: Only pay for what you use
- **Cold Start Mitigation**: Keep functions warm for critical paths
- **Storage Lifecycle**: Archive old versions to cheaper storage
- **Query Optimization**: Minimize Firestore reads
- **CDN Caching**: Reduce bandwidth costs

## Monitoring & Logging

### Firebase Functions Logs
```bash
firebase functions:log
```

### Audit Logs
- All user actions logged to Firestore
- Queryable by tenant, user, action, date
- Retention policy configurable per tenant

### Metrics to Monitor
- Document upload success rate
- Average file size
- Storage usage per tenant
- API response times
- Error rates
- Active users per tenant

## Disaster Recovery

### Backup Strategy
1. **Firestore**: Automated daily backups
2. **Digital Ocean Spaces**: Versioning enabled
3. **User Data**: Export capability via API

### Recovery Procedures
1. Restore Firestore from backup
2. Restore files from Spaces versioning
3. Replay audit logs if needed

## Future Enhancements

### Phase 2
- [ ] Real-time collaboration
- [ ] Document preview in browser
- [ ] Advanced search (full-text)
- [ ] Document workflow automation
- [ ] Email notifications
- [ ] Mobile app (React Native)

### Phase 3
- [ ] OCR for scanned documents
- [ ] AI-powered document classification
- [ ] Advanced analytics dashboard
- [ ] Integration with third-party services
- [ ] Document encryption at rest
- [ ] Compliance reports (GDPR, HIPAA)

## Development Workflow

1. **Local Development**: Use Firebase Emulators
2. **Testing**: Unit tests + Integration tests
3. **Staging**: Deploy to staging Firebase project
4. **Production**: Deploy to production Firebase project
5. **Monitoring**: Track metrics and errors

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Proprietary - All rights reserved
