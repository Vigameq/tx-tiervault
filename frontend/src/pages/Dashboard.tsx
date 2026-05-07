import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import {
  FileText,
  FolderOpen,
  Users,
  HardDrive,
  Upload,
  MessageSquare,
  Eye,
  Download,
  TrendingUp,
  Activity,
  GitBranch,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface DashboardAnalytics {
  overview: {
    totalDocuments: number
    totalFolders: number
    totalStorage: number
    totalUsers: number
    totalVersions: number
    totalComments: number
    recentUploads: number
    recentComments: number
    activeUsersToday: number
    avgVersionsPerDoc: number
  }
  documentTypes: Record<string, number>
  storageByType: Record<string, number>
  activityByType: Record<string, number>
  mostVersioned: Array<{ id: string; name: string; versionCount: number }>
  mostCommented: Array<{ id: string; name: string; commentCount: number }>
  mostViewed: Array<{ id: string; name: string; viewCount: number }>
  mostDownloaded: Array<{ id: string; name: string; downloadCount: number }>
  mostActiveUsers: Array<{ userId: string; name: string; actionCount: number }>
  recentActivity: Array<{
    action: string
    userName: string
    timestamp: string
    resourceType: string
  }>
}

const Dashboard = () => {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const { getDashboardAnalytics } = await import('@/utils/api')
      const data = await getDashboardAnalytics()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load dashboard analytics')
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  const stats = [
    {
      name: 'Total Documents',
      value: analytics?.overview.totalDocuments || 0,
      change: `+${analytics?.overview.recentUploads || 0} this week`,
      icon: FileText,
      color: 'bg-blue-500',
      changePositive: true,
    },
    {
      name: 'Storage Used',
      value: formatBytes(analytics?.overview.totalStorage || 0),
      change: `${analytics?.overview.totalDocuments || 0} files`,
      icon: HardDrive,
      color: 'bg-purple-500',
      changePositive: true,
    },
    {
      name: 'Active Users Today',
      value: analytics?.overview.activeUsersToday || 0,
      change: `${analytics?.overview.totalUsers || 0} total users`,
      icon: Users,
      color: 'bg-green-500',
      changePositive: true,
    },
    {
      name: 'Comments This Week',
      value: analytics?.overview.recentComments || 0,
      change: `${analytics?.overview.totalComments || 0} total`,
      icon: MessageSquare,
      color: 'bg-orange-500',
      changePositive: true,
    },
    {
      name: 'Documents Uploaded',
      value: analytics?.overview.recentUploads || 0,
      change: 'Last 7 days',
      icon: Upload,
      color: 'bg-indigo-500',
      changePositive: true,
    },
    {
      name: 'Total Versions',
      value: analytics?.overview.totalVersions || 0,
      change: `${analytics?.overview.avgVersionsPerDoc || 0} avg per doc`,
      icon: GitBranch,
      color: 'bg-cyan-500',
      changePositive: true,
    },
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.displayName || user?.email?.split('@')[0]}!
          </h1>
          <p className="mt-2 text-gray-600">
            Here's what's happening with your documents today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.name}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className={`${stat.color} rounded-lg p-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center">
                      <TrendingUp className={`w-4 h-4 mr-1 ${stat.changePositive ? 'text-green-500' : 'text-red-500'}`} />
                      <span className="text-sm text-gray-600">{stat.change}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Types */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents by Type</h2>
            {analytics?.documentTypes && Object.keys(analytics.documentTypes).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics.documentTypes)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 uppercase">{type}</span>
                          <span className="text-sm text-gray-600">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(count / analytics.overview.totalDocuments) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No documents yet</p>
            )}
          </div>

          {/* Activity Types */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Breakdown</h2>
            {analytics?.activityByType && Object.keys(analytics.activityByType).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics.activityByType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([action, count]) => (
                    <div key={action} className="flex items-center">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">{action}</span>
                          <span className="text-sm text-gray-600">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${(count / Object.values(analytics.activityByType).reduce((a, b) => a + b, 0)) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No activity yet</p>
            )}
          </div>
        </div>

        {/* Top Documents Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Viewed */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Most Viewed</h2>
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            {analytics?.mostViewed && analytics.mostViewed.length > 0 ? (
              <div className="space-y-3">
                {analytics.mostViewed.slice(0, 5).map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-500 mr-3">#{index + 1}</span>
                      <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{doc.name}</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600 ml-2">{doc.viewCount} views</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No views yet</p>
            )}
          </div>

          {/* Most Downloaded */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Most Downloaded</h2>
              <Download className="w-5 h-5 text-green-600" />
            </div>
            {analytics?.mostDownloaded && analytics.mostDownloaded.length > 0 ? (
              <div className="space-y-3">
                {analytics.mostDownloaded.slice(0, 5).map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-500 mr-3">#{index + 1}</span>
                      <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{doc.name}</span>
                    </div>
                    <span className="text-sm font-medium text-green-600 ml-2">{doc.downloadCount} downloads</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No downloads yet</p>
            )}
          </div>
        </div>

        {/* Engagement Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Commented */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Most Discussed</h2>
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
            {analytics?.mostCommented && analytics.mostCommented.length > 0 ? (
              <div className="space-y-3">
                {analytics.mostCommented.slice(0, 5).map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-500 mr-3">#{index + 1}</span>
                      <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{doc.name}</span>
                    </div>
                    <span className="text-sm font-medium text-orange-600 ml-2">{doc.commentCount} comments</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No comments yet</p>
            )}
          </div>

          {/* Most Versioned */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Most Versioned</h2>
              <GitBranch className="w-5 h-5 text-cyan-600" />
            </div>
            {analytics?.mostVersioned && analytics.mostVersioned.length > 0 ? (
              <div className="space-y-3">
                {analytics.mostVersioned.slice(0, 5).map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-500 mr-3">#{index + 1}</span>
                      <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{doc.name}</span>
                    </div>
                    <span className="text-sm font-medium text-cyan-600 ml-2">{doc.versionCount} versions</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No versions yet</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Activity className="w-5 h-5 text-gray-600" />
          </div>
          {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentActivity.slice(0, 10).map((activity, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-lg mr-3 ${getActionColor(activity.action)}`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.userName}</span>
                      {' '}
                      <span className="text-gray-600">{activity.action}</span>
                      {' '}
                      <span className="text-gray-600">{activity.resourceType}</span>
                    </p>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm">Upload your first document to get started!</p>
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}

export default Dashboard
