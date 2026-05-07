import { useState, useEffect } from 'react'
import { X, Folder, Home, ChevronRight } from 'lucide-react'

interface MoveToFolderProps {
  documentId: string
  documentName: string
  currentFolderId?: string
  onClose: () => void
  onMoved: () => void
}

interface FolderItem {
  id: string
  name: string
  path: string
  parentId?: string | null
  level?: number
  children?: FolderItem[]
}

export default function MoveToFolder({
  documentId,
  documentName,
  currentFolderId,
  onClose,
  onMoved
}: MoveToFolderProps) {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    try {
      const { getFolders } = await import('@/utils/api')
      // Get all folders including subfolders
      const response = await getFolders(undefined, true)

      // Build hierarchy and flatten for display with indentation
      const folderMap = new Map<string, FolderItem>()
      const allFolders: FolderItem[] = response.folders.map((folder: any) => ({
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        level: 0,
        children: []
      }))

      // Create a map for quick lookup
      allFolders.forEach(folder => {
        folderMap.set(folder.id, folder)
      })

      // Build parent-child relationships and calculate levels
      const rootFolders: FolderItem[] = []
      allFolders.forEach(folder => {
        if (folder.parentId) {
          const parent = folderMap.get(folder.parentId)
          if (parent) {
            parent.children = parent.children || []
            parent.children.push(folder)
          }
        } else {
          rootFolders.push(folder)
        }
      })

      // Flatten the hierarchy for display with proper levels
      const flattenFolders = (folders: FolderItem[], level: number = 0): FolderItem[] => {
        const result: FolderItem[] = []
        folders.forEach(folder => {
          const folderWithLevel = { ...folder, level }
          result.push(folderWithLevel)
          if (folder.children && folder.children.length > 0) {
            result.push(...flattenFolders(folder.children, level + 1))
          }
        })
        return result
      }

      setFolders(flattenFolders(rootFolders))
    } catch (err) {
      console.error('Error fetching folders:', err)
    }
  }

  const handleMove = async () => {
    try {
      setLoading(true)
      setError('')

      const { moveDocument } = await import('@/utils/api')
      await moveDocument(documentId, selectedFolderId || undefined)

      onMoved()
      onClose()
    } catch (err: any) {
      console.error('Move error:', err)
      setError(err.message || 'Failed to move document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Move Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            Moving: <span className="font-medium text-gray-900">{documentName}</span>
          </p>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Destination
          </label>

          <div className="border rounded-md max-h-64 overflow-y-auto">
            {/* Root option */}
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 ${
                selectedFolderId === null ? 'bg-blue-50 border-l-4 border-blue-600' : ''
              }`}
            >
              <Home className="w-5 h-5 mr-3 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">Root (No Folder)</span>
            </button>

            {/* Folder options with hierarchy */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 ${
                  selectedFolderId === folder.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
                style={{ paddingLeft: `${16 + (folder.level || 0) * 24}px` }}
              >
                {(folder.level || 0) > 0 && (
                  <ChevronRight className="w-4 h-4 mr-1 text-gray-400" />
                )}
                <Folder className="w-5 h-5 mr-3 text-yellow-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{folder.name}</div>
                  <div className="text-xs text-gray-500">{folder.path}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Moving...' : 'Move Document'}
          </button>
        </div>
      </div>
    </div>
  )
}
