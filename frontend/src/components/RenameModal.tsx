import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface RenameModalProps {
  type: 'document' | 'folder'
  id: string
  currentName: string
  onClose: () => void
  onRenamed: () => void
}

export default function RenameModal({ type, id, currentName, onClose, onRenamed }: RenameModalProps) {
  const [newName, setNewName] = useState(currentName)
  const [loading, setLoading] = useState(false)

  const handleRename = async () => {
    if (!newName.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    if (newName === currentName) {
      toast.info('Name unchanged')
      onClose()
      return
    }

    try {
      setLoading(true)

      if (type === 'document') {
        const { renameDocument } = await import('@/utils/api')
        await renameDocument(id, newName)
        toast.success('Document renamed successfully')
      } else {
        const { renameFolder } = await import('@/utils/api')
        await renameFolder(id, newName)
        toast.success('Folder renamed successfully')
      }

      onRenamed()
      onClose()
    } catch (error: any) {
      console.error('Rename error:', error)
      toast.error(error.message || `Failed to rename ${type}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Rename {type === 'document' ? 'Document' : 'Folder'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Enter ${type} name`}
            autoFocus
          />
        </div>

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
            onClick={handleRename}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Renaming...' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  )
}
