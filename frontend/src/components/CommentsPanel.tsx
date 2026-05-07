import { useState, useEffect } from 'react'
import { X, Send, MessageSquare, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface CommentsPanelProps {
  documentId: string
  documentName: string
  onClose: () => void
}

interface Comment {
  id: string
  text: string
  userId: string
  userName: string
  createdAt: string
}

export default function CommentsPanel({ documentId, documentName, onClose }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [documentId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const { getDocumentComments } = await import('@/utils/api')
      const data = await getDocumentComments(documentId)
      setComments(data.comments)
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const addComment = async () => {
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty')
      return
    }

    try {
      setSubmitting(true)
      const { addDocumentComment } = await import('@/utils/api')
      const comment = await addDocumentComment(documentId, newComment)
      setComments([comment, ...comments])
      setNewComment('')
      toast.success('Comment added')
    } catch (error: any) {
      console.error('Error adding comment:', error)
      toast.error(error.message || 'Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    try {
      const { deleteDocumentComment } = await import('@/utils/api')
      await deleteDocumentComment(documentId, commentId)
      setComments(comments.filter(c => c.id !== commentId))
      toast.success('Comment deleted')
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      toast.error(error.message || 'Failed to delete comment')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      addComment()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Comments</h2>
            <p className="text-sm text-gray-600 mt-1">{documentName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No comments yet</p>
              <p className="text-sm mt-2">Be the first to comment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {comment.userName}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Add a comment... (Ctrl+Enter to send)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
            <button
              onClick={addComment}
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
