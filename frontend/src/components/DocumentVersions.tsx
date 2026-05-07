import { useState, useEffect } from 'react'
import { X, Download, Eye, Clock, User, FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentVersionsProps {
  documentId: string
  documentName: string
  onClose: () => void
  onPreviewVersion: (versionId: string, versionNumber: string) => void
}

const handlePreviewClick = (
  versionId: string,
  versionNumber: string,
  isLatest: boolean,
  onPreviewVersion: (versionId: string, versionNumber: string) => void,
  latestVersion: string
) => {
  // Show warning for non-latest versions
  if (!isLatest) {
    const confirmed = window.confirm(
      `⚠️ Warning: You are about to preview version ${versionNumber}, which is NOT the latest version.\n\nThe latest version is ${latestVersion}.\n\nAre you sure you want to continue?`
    )
    if (!confirmed) {
      return
    }
  }

  onPreviewVersion(versionId, versionNumber)
}

interface Version {
  id: string
  version: string
  size: number
  comment: string
  changedBy: string
  createdAt: string
  checksum: string
}

export default function DocumentVersions({
  documentId,
  documentName,
  onClose,
  onPreviewVersion
}: DocumentVersionsProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVersions()
  }, [documentId])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const { getDocumentVersions } = await import('@/utils/api')
      const response = await getDocumentVersions(documentId)
      setVersions(response.versions)
    } catch (error) {
      console.error('Error fetching versions:', error)
      toast.error('Failed to load versions')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (versionId: string, versionNumber: string, isLatest: boolean) => {
    // Show warning for non-latest versions
    if (!isLatest) {
      const confirmed = window.confirm(
        `⚠️ Warning: You are about to download version ${versionNumber}, which is NOT the latest version.\n\nThe latest version is ${versions[0]?.version}.\n\nAre you sure you want to continue?`
      )
      if (!confirmed) {
        return
      }
    }

    try {
      toast.info(`Downloading version ${versionNumber}...`)
      const { downloadDocument } = await import('@/utils/api')
      await downloadDocument(documentId, versionId)
      toast.success('Download started')
    } catch (error: any) {
      console.error('Download error:', error)
      toast.error(error.message || 'Failed to download version')
    }
  }

  const handleDeleteVersion = async (versionId: string, versionNumber: string, isLatest: boolean) => {
    // Prevent deleting the latest/only version
    if (versions.length === 1) {
      toast.error('Cannot delete the only version. Delete the document instead.')
      return
    }

    if (isLatest) {
      const confirmed = window.confirm(
        `⚠️ Warning: You are about to delete the LATEST version (${versionNumber}).\n\nThis will make version ${versions[1]?.version} the new latest version.\n\nAre you sure you want to continue?`
      )
      if (!confirmed) {
        return
      }
    } else {
      const confirmed = window.confirm(
        `Are you sure you want to delete version ${versionNumber}?\n\nThis action cannot be undone.`
      )
      if (!confirmed) {
        return
      }
    }

    try {
      const { deleteDocumentVersion } = await import('@/utils/api')
      await deleteDocumentVersion(documentId, versionId)
      toast.success(`Version ${versionNumber} deleted successfully`)

      // Refresh versions list
      fetchVersions()
    } catch (error: any) {
      console.error('Delete version error:', error)
      toast.error(error.message || 'Failed to delete version')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date'

    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
            <p className="text-sm text-gray-600 mt-1">{documentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No versions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="border rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          v{version.version}
                        </span>
                        {index === 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Latest
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(version.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{version.changedBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>{formatFileSize(version.size)}</span>
                        </div>
                        {version.comment && (
                          <div className="col-span-2 text-sm text-gray-500 italic">
                            "{version.comment}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handlePreviewClick(
                          version.id,
                          version.version,
                          index === 0,
                          onPreviewVersion,
                          versions[0]?.version || ''
                        )}
                        className="p-2 hover:bg-purple-50 rounded text-purple-600"
                        title="Preview this version"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(version.id, version.version, index === 0)}
                        className="p-2 hover:bg-blue-50 rounded text-blue-600"
                        title="Download this version"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVersion(version.id, version.version, index === 0)}
                        className="p-2 hover:bg-red-50 rounded text-red-600"
                        title="Delete this version"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>{versions.length} version{versions.length !== 1 ? 's' : ''} total</span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
