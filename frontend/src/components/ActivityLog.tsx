import { useState, useEffect } from 'react'
import { X, Eye, Download, Upload, Edit, Trash2, Clock, User } from 'lucide-react'
import { toast } from 'sonner'

interface ActivityLogProps {
  documentId: string
  documentName: string
  onClose: () => void
}

interface Activity {
  id: string
  action: string
  userId: string
  userName?: string
  timestamp: string
  metadata?: any
}

export default function ActivityLog({ documentId, documentName, onClose }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [documentId])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const { getDocumentActivity } = await import('@/utils/api')
      const data = await getDocumentActivity(documentId)
      setActivities(data.activities)
    } catch (error) {
      console.error('Error fetching activity:', error)
      toast.error('Failed to load activity log')
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view':
      case 'preview':
        return <Eye className="w-4 h-4" />
      case 'download':
        return <Download className="w-4 h-4" />
      case 'upload':
      case 'create':
        return <Upload className="w-4 h-4" />
      case 'update':
      case 'rename':
        return <Edit className="w-4 h-4" />
      case 'delete':
        return <Trash2 className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'view':
      case 'preview':
        return 'text-blue-600 bg-blue-50'
      case 'download':
        return 'text-green-600 bg-green-50'
      case 'upload':
      case 'create':
        return 'text-purple-600 bg-purple-50'
      case 'update':
      case 'rename':
        return 'text-orange-600 bg-orange-50'
      case 'delete':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
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
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionText = (activity: Activity) => {
    const action = activity.action.toLowerCase()
    switch (action) {
      case 'view':
      case 'preview':
        return 'viewed'
      case 'download':
        return 'downloaded'
      case 'upload':
      case 'create':
        return 'uploaded'
      case 'update':
        return 'updated'
      case 'rename':
        return 'renamed'
      case 'delete':
        return 'deleted'
      default:
        return action
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Activity Log</h2>
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
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-lg ${getActionColor(activity.action)}`}>
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {activity.userName || 'Unknown User'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {getActionText(activity)} this document
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
