import { useState, useEffect } from 'react'
import { X, Users, UserPlus, UserMinus } from 'lucide-react'
import { toast } from 'sonner'

interface ShareFolderModalProps {
  folder: {
    id: string
    name: string
  }
  onClose: () => void
  onSuccess: () => void
}

interface Supplier {
  id: string
  email: string
  displayName: string
  assignedFolders: string[]
}

interface SharedUser {
  id: string
  email: string
  displayName: string
  role: string
}

export default function ShareFolderModal({ folder, onClose, onSuccess }: ShareFolderModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [sharedWith, setSharedWith] = useState<SharedUser[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetchData()
  }, [folder.id])

  const fetchData = async () => {
    try {
      setLoadingData(true)
      const { getSuppliers, getFolderSharedWith } = await import('@/utils/api')

      const [suppliersData, sharedData] = await Promise.all([
        getSuppliers(),
        getFolderSharedWith(folder.id),
      ])

      setSuppliers(suppliersData.suppliers)
      setSharedWith(sharedData.users)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load sharing information')
    } finally {
      setLoadingData(false)
    }
  }

  const handleShare = async () => {
    if (selectedSuppliers.length === 0) {
      toast.error('Please select at least one supplier')
      return
    }

    try {
      setLoading(true)
      const { shareFolderWithUsers } = await import('@/utils/api')
      await shareFolderWithUsers(folder.id, selectedSuppliers)
      toast.success(`Folder shared with ${selectedSuppliers.length} supplier(s)`)
      setSelectedSuppliers([])
      fetchData() // Refresh the shared list
    } catch (error: any) {
      console.error('Error sharing folder:', error)
      toast.error(error.message || 'Failed to share folder')
    } finally {
      setLoading(false)
    }
  }

  const handleUnshare = async (userId: string) => {
    if (!confirm('Remove access for this supplier?')) return

    try {
      const { unshareFolderFromUsers } = await import('@/utils/api')
      await unshareFolderFromUsers(folder.id, [userId])
      toast.success('Access removed successfully')
      fetchData() // Refresh the shared list
    } catch (error: any) {
      console.error('Error unsharing folder:', error)
      toast.error(error.message || 'Failed to remove access')
    }
  }

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    )
  }

  const availableSuppliers = suppliers.filter(
    (supplier) => !sharedWith.some((user) => user.id === supplier.id)
  )

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share Folder</h2>
            <p className="text-sm text-gray-600 mt-1">{folder.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Currently Shared With */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Currently Shared With ({sharedWith.length})
            </h3>
            {sharedWith.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Not shared with anyone yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sharedWith.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {user.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </div>
                      <div className="ml-3 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnshare(user.id)}
                      className="ml-3 flex-shrink-0 text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                      title="Remove access"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Suppliers */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Add Suppliers ({availableSuppliers.length} available)
            </h3>
            {availableSuppliers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">
                  {suppliers.length === 0
                    ? 'No suppliers available. Create supplier users first.'
                    : 'All suppliers already have access to this folder.'}
                </p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                {availableSuppliers.map((supplier) => (
                  <label
                    key={supplier.id}
                    className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.includes(supplier.id)}
                      onChange={() => toggleSupplier(supplier.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {supplier.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{supplier.email}</p>
                      {supplier.assignedFolders.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Has access to {supplier.assignedFolders.length} folder(s)
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedSuppliers.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedSuppliers.length} supplier(s) selected
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          {availableSuppliers.length > 0 && (
            <button
              onClick={handleShare}
              disabled={loading || selectedSuppliers.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Sharing...' : `Share with ${selectedSuppliers.length || ''} Supplier${selectedSuppliers.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
