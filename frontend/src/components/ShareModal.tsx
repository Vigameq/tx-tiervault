import { useState, useEffect } from 'react'
import { X, Link as LinkIcon, Copy, UserPlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ShareModalProps {
  documentId: string
  documentName: string
  onClose: () => void
}

interface ShareLink {
  id: string
  token: string
  expiresAt: string | null
  createdAt: string
}

export default function ShareModal({ documentId, documentName, onClose }: ShareModalProps) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expiryDays, setExpiryDays] = useState<number>(7)

  useEffect(() => {
    fetchShareLinks()
  }, [documentId])

  const fetchShareLinks = async () => {
    try {
      setLoading(true)
      const { getShareLinks } = await import('@/utils/api')
      const links = await getShareLinks(documentId)
      setShareLinks(links)
    } catch (error) {
      console.error('Error fetching share links:', error)
      toast.error('Failed to load share links')
    } finally {
      setLoading(false)
    }
  }

  const createShareLink = async () => {
    try {
      setCreating(true)
      const { createShareLink: create } = await import('@/utils/api')
      const newLink = await create(documentId, expiryDays)
      setShareLinks([...shareLinks, newLink])
      toast.success('Share link created')
    } catch (error: any) {
      console.error('Error creating share link:', error)
      toast.error(error.message || 'Failed to create share link')
    } finally {
      setCreating(false)
    }
  }

  const deleteShareLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this share link?')) return

    try {
      const { deleteShareLink } = await import('@/utils/api')
      await deleteShareLink(documentId, linkId)
      setShareLinks(shareLinks.filter(link => link.id !== linkId))
      toast.success('Share link deleted')
    } catch (error: any) {
      console.error('Error deleting share link:', error)
      toast.error(error.message || 'Failed to delete share link')
    }
  }

  const copyToClipboard = (token: string) => {
    const shareUrl = `${window.location.origin}/shared/${token}`
    navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied to clipboard')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share Document</h2>
            <p className="text-sm text-gray-600 mt-1">{documentName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Create Share Link */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Create Share Link</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Expires in</label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={0}>Never</option>
                </select>
              </div>
              <button
                onClick={createShareLink}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mt-5"
              >
                <LinkIcon className="w-4 h-4" />
                {creating ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </div>

          {/* Existing Share Links */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Active Share Links</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <LinkIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No share links yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <div key={link.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <LinkIcon className="w-4 h-4 text-gray-400" />
                          <code className="text-xs text-gray-600 truncate">
                            {window.location.origin}/shared/{link.token}
                          </code>
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {formatDate(link.createdAt)}
                          {link.expiresAt && ` • Expires: ${formatDate(link.expiresAt)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => copyToClipboard(link.token)}
                          className="p-2 hover:bg-gray-100 rounded text-gray-600"
                          title="Copy link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteShareLink(link.id)}
                          className="p-2 hover:bg-red-50 rounded text-red-600"
                          title="Delete link"
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
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
