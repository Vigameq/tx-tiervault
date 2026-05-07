export interface Tenant {
  id: string;
  name: string;
  domain: string;
  settings: {
    maxStorageGB: number;
    allowedFileTypes: string[];
    retentionDays: number;
  };
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  role: 'admin' | 'manager' | 'editor' | 'viewer';
  isActive: boolean;
  lastLoginAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface Document {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  size: number;
  folderId: string | null;
  currentVersion: string;
  latestVersionId: string;
  metadata: {
    tags: string[];
    category: string;
    customFields: Record<string, any>;
  };
  permissions: Permission[];
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  fileUrl: string;
  fileKey: string;
  size: number;
  checksum: string;
  comment: string;
  changeType: 'created' | 'updated' | 'restored';
  changedBy: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface Folder {
  id: string;
  tenantId: string;
  name: string;
  parentId: string | null;
  path: string;
  permissions: Permission[];
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface Permission {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: 'upload' | 'download' | 'delete' | 'share' | 'update' | 'view';
  resourceType: 'document' | 'folder' | 'user';
  resourceId: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: FirebaseFirestore.Timestamp;
}

export interface UploadFileRequest {
  file: Buffer;
  fileName: string;
  fileType: string;
  folderId?: string;
  comment?: string;
}

export interface ComparisonResult {
  hasChanges: boolean;
  checksum: string;
  changedFields?: string[];
}
