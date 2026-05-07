import { useState, useEffect } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface CreateUserModalProps {
  onClose: () => void
  onSuccess: () => void
}

interface Folder {
  id: string
  name: string
  path: string
}

export default function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('viewer')
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(false)

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

    if (!email || !password || !displayName) {
      toast.error('Please fill in all required fields')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (role === 'supplier' && selectedFolders.length === 0) {
      toast.error('Please assign at least one folder to the supplier')
      return
    }

    try {
      setLoading(true)
      const { createUser } = await import('@/utils/api')

      const userData: any = {
        email,
        password,
        displayName,
        role,
      }

      if (role === 'supplier') {
        userData.assignedFolders = selectedFolders
      }

      await createUser(userData)
      toast.success('User created successfully')
      onSuccess()
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error(error.message || 'Failed to create user')
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
          <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
                required
              />
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
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)
                  setSelectedFolders([])
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="supplier">Supplier</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {role === 'admin' && 'Full system access'}
                {role === 'manager' && 'Can manage users and see all documents'}
                {role === 'editor' && 'Can upload, edit, and delete documents'}
                {role === 'viewer' && 'Read-only access to documents'}
                {role === 'supplier' && 'Access only to assigned folders'}
              </p>
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
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}
