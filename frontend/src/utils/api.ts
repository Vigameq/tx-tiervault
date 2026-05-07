import { auth } from '@/config/firebase'

// Temporarily use production for testing
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://us-central1-tiervault-tx.cloudfunctions.net/api'
// const API_BASE_URL = import.meta.env.DEV
//   ? 'http://localhost:5001/tiervault-tx/us-central1/api'
//   : (import.meta.env.VITE_API_BASE_URL || 'https://us-central1-tiervault-tx.cloudfunctions.net/api')

export const getAuthToken = async () => {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return await user.getIdToken()
}

export const uploadDocument = async (
  file: File,
  options?: {
    folderId?: string
    comment?: string
    onProgress?: (progress: number) => void
  }
) => {
  const formData = new FormData()
  formData.append('file', file)
  if (options?.folderId) formData.append('folderId', options.folderId)
  if (options?.comment) formData.append('comment', options.comment)

  const token = await getAuthToken()

  return new Promise<{
    message: string
    document: any
    version: any
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && options?.onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100)
        options.onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(xhr.responseText))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open('POST', `${API_BASE_URL}/documents/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })
}

export const getDocuments = async (folderId?: string) => {
  const token = await getAuthToken()

  const url = folderId
    ? `${API_BASE_URL}/documents?folderId=${folderId}`
    : `${API_BASE_URL}/documents`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch documents')
  }

  return response.json()
}

export const getDocument = async (documentId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch document')
  }

  return response.json()
}

export const downloadDocument = async (documentId: string, versionId?: string, previewMode: boolean = false) => {
  const token = await getAuthToken()

  const url = versionId
    ? `${API_BASE_URL}/documents/${documentId}/download?versionId=${versionId}`
    : `${API_BASE_URL}/documents/${documentId}/download`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to get download URL')
  }

  const data = await response.json()

  if (!data.downloadUrl) {
    throw new Error('No download URL received from server')
  }

  // If not in preview mode, open the signed URL in a new tab to trigger download
  if (!previewMode) {
    window.open(data.downloadUrl, '_blank')
  }

  return data
}

export const getDocumentVersions = async (documentId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch versions')
  }

  return response.json()
}

export const moveDocument = async (documentId: string, folderId?: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/move`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ folderId }),
  })

  if (!response.ok) {
    throw new Error('Failed to move document')
  }

  return response.json()
}

export const deleteDocument = async (documentId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to delete document')
  }

  return response.json()
}

export const deleteDocumentVersion = async (documentId: string, versionId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/${versionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to delete version')
  }

  return response.json()
}

// Folder APIs
export const getFolders = async (parentId?: string, all?: boolean) => {
  const token = await getAuthToken()

  let url = `${API_BASE_URL}/folders`
  const params = new URLSearchParams()

  if (all) {
    params.append('all', 'true')
  } else if (parentId) {
    params.append('parentId', parentId)
  }

  if (params.toString()) {
    url += '?' + params.toString()
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch folders')
  }

  return response.json()
}

export const createFolder = async (name: string, parentId?: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/folders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, parentId }),
  })

  if (!response.ok) {
    throw new Error('Failed to create folder')
  }

  return response.json()
}

export const deleteFolder = async (folderId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to delete folder')
  }

  return response.json()
}

export const renameDocument = async (documentId: string, newName: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/rename`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to rename document')
  }

  return response.json()
}

export const renameFolder = async (folderId: string, newName: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/folders/${folderId}/rename`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to rename folder')
  }

  return response.json()
}

export const getStorageUsage = async () => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/storage/usage`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch storage usage')
  }

  return response.json()
}

export const getDocumentActivity = async (documentId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/activity`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch activity log')
  }

  return response.json()
}

export const logDocumentView = async (documentId: string) => {
  const token = await getAuthToken()

  await fetch(`${API_BASE_URL}/documents/${documentId}/log-view`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
}

// Comment APIs
export const getDocumentComments = async (documentId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/comments`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch comments')
  }

  return response.json()
}

export const addDocumentComment = async (documentId: string, text: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to add comment')
  }

  return response.json()
}

export const deleteDocumentComment = async (documentId: string, commentId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to delete comment')
  }

  return response.json()
}

// Analytics APIs
export const getDashboardAnalytics = async () => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard analytics')
  }

  return response.json()
}

// User Management APIs
export const getUsers = async () => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  return response.json()
}

export const createUser = async (userData: {
  email: string
  password: string
  displayName: string
  role: string
  assignedFolders?: string[]
}) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to create user')
  }

  return response.json()
}

export const updateUser = async (userId: string, userData: {
  displayName: string
  role: string
  isActive: boolean
  assignedFolders?: string[]
}) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to update user')
  }

  return response.json()
}

export const deleteUser = async (userId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to delete user')
  }

  return response.json()
}

export const getSuppliers = async () => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/users/suppliers`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch suppliers')
  }

  return response.json()
}

// Folder Sharing APIs
export const shareFolderWithUsers = async (folderId: string, userIds: string[]) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/folders/${folderId}/share`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userIds }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to share folder')
  }

  return response.json()
}

export const unshareFolderFromUsers = async (folderId: string, userIds: string[]) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/folders/${folderId}/unshare`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userIds }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to unshare folder')
  }

  return response.json()
}

export const getFolderSharedWith = async (folderId: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/folders/${folderId}/shared-with`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch shared users')
  }

  return response.json()
}

// Settings APIs
export const getCurrentUserProfile = async () => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/users/me/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }

  return response.json()
}

export const updateCurrentUserProfile = async (data: {
  displayName?: string
  preferences?: any
  notificationSettings?: any
}) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/users/me/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to update profile')
  }

  return response.json()
}

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/users/me/change-password`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to change password')
  }

  return response.json()
}
