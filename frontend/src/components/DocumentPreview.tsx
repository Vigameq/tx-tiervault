import { useEffect, useState } from 'react'
import { X, Download, ExternalLink, AlertCircle } from 'lucide-react'

interface DocumentPreviewProps {
  documentId: string
  documentName: string
  versionId?: string
  versionNumber?: string
  onClose: () => void
}

export default function DocumentPreview({ documentId, documentName, versionId, versionNumber, onClose }: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mimeType, setMimeType] = useState('')

  useEffect(() => {
    fetchPreviewUrl()

    return () => {
      // Cleanup: revoke object URL if created
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [documentId])

  const fetchPreviewUrl = async () => {
    try {
      setLoading(true)
      setError('')

      const { getDocument, downloadDocument } = await import('@/utils/api')

      // Get document metadata
      const doc = await getDocument(documentId)

      // Convert file extension to MIME type
      const fileType = doc.type || documentName.split('.').pop()?.toLowerCase() || ''
      const mimeTypeMap: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        txt: 'text/plain',
        html: 'text/html',
        csv: 'text/csv',
        step: 'application/step',
        stp: 'application/step',
      }

      setMimeType(mimeTypeMap[fileType] || 'application/octet-stream')

      // Get signed URL for preview (with optional versionId)
      const result = await downloadDocument(documentId, versionId, true)
      setPreviewUrl(result.downloadUrl)
    } catch (err: any) {
      console.error('Preview error:', err)
      setError(err.message || 'Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const { downloadDocument } = await import('@/utils/api')
      await downloadDocument(documentId)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const canPreview = () => {
    if (!mimeType) return false

    // Supported preview types
    const previewableTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/html',
      'text/csv',
    ]

    return previewableTypes.some(type => mimeType.includes(type))
  }

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      )
    }

    if (!canPreview()) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Preview not available for this file type</p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download to View
            </button>
          </div>
        </div>
      )
    }

    // PDF Preview
    if (mimeType.includes('pdf')) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title={documentName}
        />
      )
    }

    // Image Preview
    if (mimeType.includes('image')) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 p-4">
          <img
            src={previewUrl}
            alt={documentName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    }

    // Text Preview
    if (mimeType.includes('text')) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0 bg-white p-4"
          title={documentName}
        />
      )
    }

    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {documentName}
            </h2>
            {versionNumber && (
              <p className="text-sm text-gray-600">Version {versionNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  )
}

const FileIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
)
