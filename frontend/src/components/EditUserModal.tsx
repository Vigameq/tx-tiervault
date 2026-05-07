import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

interface EditUserModalProps {
  user: {
    id: string
    email: string
    displayName: string
    role: string
    isActive: boolean
    assignedFolders?: string[]
  }
  onClose: () => void
  onSuccess: () => void
}

interface Folder {
  id: string
  name: string
  path: string
}

export default function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
  const currentUser = useAuthStore((state) => state.user)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [role, setRole] = useState(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolders, setSelectedFolders] = useState<string[]>(user.assignedFolders || [])
  const [loading, setLoading] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(false)

  const isSelf = currentUser?.uid === user.id

  useEffect(() => {
    if (role === 'supplier') {
      fetchFolders()
    }
  }, [role])

  const fetchFolders = async () => {
    try {
      setLoadingFolders(true)
      const { getFolders } = await import('@/utils/api')
      const data = await getFolders(undefined, true) // Get all folders
      setFolders(data.folders)
    } catch (error) {
      console.error('Error fetching folders:', error)
      toast.error('Failed to load folders')
    } finally {
      setLoadingFolders(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName) {
      toast.error('Display name is required')
      return
    }

    if (role === 'supplier' && selectedFolders.length === 0) {
      toast.error('Please assign at least one folder to the supplier')
      return
    }

    if (isSelf && role !== user.role) {
      toast.error('You cannot change your own role')
      return
    }

    try {
      setLoading(true)
      const { updateUser } = await import('@/utils/api')

      const userData: any = {
        displayName,
        role,
        isActive,
      }

      if (role === 'supplier') {
        userData.assignedFolders = selectedFolders
      }

      await updateUser(user.id, userData)
      toast.success('User updated successfully')
      onSuccess()
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error(error.message || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    setSelectedFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)
                  if (e.target.value !== 'supplier') {
                    setSelectedFolders([])
                  }
                }}
                disabled={isSelf}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isSelf ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="supplier">Supplier</option>
              </select>
              {isSelf && <p className="mt-1 text-xs text-gray-500">You cannot change your own role</p>}
              {!isSelf && (
                <p className="mt-1 text-xs text-gray-500">
                  {role === 'admin' && 'Full system access'}
                  {role === 'manager' && 'Can manage users and see all documents'}
                  {role === 'editor' && 'Can upload, edit, and delete documents'}
                  {role === 'viewer' && 'Read-only access to documents'}
                  {role === 'supplier' && 'Access only to assigned folders'}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSelf}
                  className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                    isSelf ? 'cursor-not-allowed' : ''
                  }`}
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
              {isSelf && <p className="mt-1 text-xs text-gray-500">You cannot deactivate yourself</p>}
            </div>

            {role === 'supplier' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Folders <span className="text-red-500">*</span>
                </label>
                {loadingFolders ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : folders.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                    No folders available. Create folders first to assign to suppliers.
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                    {folders.map((folder) => (
                      <label
                        key={folder.id}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFolders.includes(folder.id)}
                          onChange={() => toggleFolder(folder.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-900">{folder.path}</span>
                      </label>
                    ))}
                  </div>
                )}
                {selectedFolders.length > 0 && (
                  <p className="mt-2 text-xs text-gray-600">
                    {selectedFolders.length} folder(s) selected
                  </p>
                )}
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
