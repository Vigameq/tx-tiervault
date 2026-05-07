export interface Tenant {
  id: string
  name: string
  domain: string
  settings: {
    maxStorageGB: number
    allowedFileTypes: string[]
    retentionDays: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  tenantId: string
  name: string
  type: string
  size: number
  folderId: string | null
  currentVersion: string
  latestVersionId: string
  metadata: {
    tags: string[]
    category: string
    customFields: Record<string, any>
  }
  permissions: {
    userId: string
    role: 'owner' | 'editor' | 'viewer'
  }[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface DocumentVersion {
  id: string
  documentId: string
  version: string
  fileUrl: string
  fileKey: string
  size: number
  checksum: string
  comment: string
  changeType: 'created' | 'updated' | 'restored'
  changedBy: string
  createdAt: Date
}

export interface Folder {
  id: string
  tenantId: string
  name: string
  parentId: string | null
  path: string
  permissions: {
    userId: string
    role: 'owner' | 'editor' | 'viewer'
  }[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  tenantId: string
  userId: string
  action: 'upload' | 'download' | 'delete' | 'share' | 'update' | 'view'
  resourceType: 'document' | 'folder' | 'user'
  resourceId: string
  metadata: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
}

export interface User {
  id: string
  email: string
  displayName: string
  tenantId: string
  role: 'admin' | 'manager' | 'editor' | 'viewer'
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}
