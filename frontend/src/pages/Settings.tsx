import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import { User, Bell, Lock, Database, Save } from 'lucide-react'
import Layout from '@/components/Layout'
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changePassword,
  getStorageUsage
} from '@/utils/api'

interface UserProfile {
  id: string
  email: string
  displayName: string
  role: string
  preferences: {
    timezone?: string
    dateFormat?: string
    itemsPerPage?: number
  }
  notificationSettings: {
    emailOnUpload: boolean
    emailOnComment: boolean
    emailOnShare: boolean
    activityDigest: 'none' | 'daily' | 'weekly'
  }
}

interface StorageUsage {
  totalSize: number
  totalDocuments: number
  totalVersions: number
  formattedSize: string
}

export default function Settings() {
  const currentUser = useAuthStore((state) => state.user)
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'storage'>('profile')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Notification settings
  const [emailOnUpload, setEmailOnUpload] = useState(true)
  const [emailOnComment, setEmailOnComment] = useState(true)
  const [emailOnShare, setEmailOnShare] = useState(true)
  const [activityDigest, setActivityDigest] = useState<'none' | 'daily' | 'weekly'>('weekly')

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Storage usage (admin only)
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null)

  useEffect(() => {
    fetchProfile()
    if (currentUser?.role === 'admin') {
      fetchStorageUsage()
    }
  }, [currentUser])

  const fetchProfile = async () => {
    try {
      setLoadingData(true)
      const data = await getCurrentUserProfile()
      setProfile(data)
      setDisplayName(data.displayName || '')
      setTimezone(data.preferences?.timezone || 'UTC')
      setDateFormat(data.preferences?.dateFormat || 'MM/DD/YYYY')
      setItemsPerPage(data.preferences?.itemsPerPage || 20)
      setEmailOnUpload(data.notificationSettings?.emailOnUpload ?? true)
      setEmailOnComment(data.notificationSettings?.emailOnComment ?? true)
      setEmailOnShare(data.notificationSettings?.emailOnShare ?? true)
      setActivityDigest(data.notificationSettings?.activityDigest || 'weekly')
    } catch (error: any) {
      console.error('Failed to load profile:', error)
      toast.error('Failed to load profile settings')
    } finally {
      setLoadingData(false)
    }
  }

  const fetchStorageUsage = async () => {
    try {
      const data = await getStorageUsage()
      setStorageUsage(data)
    } catch (error) {
      console.error('Failed to load storage usage:', error)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      await updateCurrentUserProfile({
        displayName,
        preferences: {
          timezone,
          dateFormat,
          itemsPerPage,
        },
      })
      toast.success('Profile updated successfully')
      fetchProfile()
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setLoading(true)
      await updateCurrentUserProfile({
        notificationSettings: {
          emailOnUpload,
          emailOnComment,
          emailOnShare,
          activityDigest,
        },
      })
      toast.success('Notification settings updated successfully')
    } catch (error: any) {
      console.error('Failed to update notifications:', error)
      toast.error(error.message || 'Failed to update notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      await changePassword(currentPassword, newPassword)
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Failed to change password:', error)
      toast.error(error.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Lock },
  ]

  if (currentUser?.role === 'admin') {
    tabs.push({ id: 'storage' as const, label: 'Storage', icon: Database })
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={profile?.role || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed capitalize"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Preferences</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Items Per Page
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h2>
            <p className="text-sm text-gray-600 mb-6">
              Choose what updates you'd like to receive via email
            </p>

            <div className="space-y-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={emailOnUpload}
                  onChange={(e) => setEmailOnUpload(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">
                    Document Uploads
                  </span>
                  <span className="block text-sm text-gray-500">
                    Notify me when documents are uploaded to my assigned folders
                  </span>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={emailOnComment}
                  onChange={(e) => setEmailOnComment(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">
                    Comments
                  </span>
                  <span className="block text-sm text-gray-500">
                    Notify me when someone comments on my documents
                  </span>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={emailOnShare}
                  onChange={(e) => setEmailOnShare(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">
                    Folder Sharing
                  </span>
                  <span className="block text-sm text-gray-500">
                    Notify me when folders are shared with me
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Activity Digest</h3>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="none"
                  checked={activityDigest === 'none'}
                  onChange={(e) => setActivityDigest(e.target.value as 'none')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-900">None</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  value="daily"
                  checked={activityDigest === 'daily'}
                  onChange={(e) => setActivityDigest(e.target.value as 'daily')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-900">Daily summary</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  value="weekly"
                  checked={activityDigest === 'weekly'}
                  onChange={(e) => setActivityDigest(e.target.value as 'weekly')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-900">Weekly summary</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveNotifications}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* Storage Tab (Admin only) */}
      {activeTab === 'storage' && currentUser?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h2>

          {storageUsage ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Total Storage</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {storageUsage.formattedSize}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Total Documents</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {storageUsage.totalDocuments.toLocaleString()}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">Total Versions</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {storageUsage.totalVersions.toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Storage Breakdown</p>
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full"
                    style={{
                      width: `${Math.min((storageUsage.totalSize / (10 * 1024 * 1024 * 1024)) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatBytes(storageUsage.totalSize)} used
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Loading storage information...
            </div>
          )}
        </div>
      )}
      </div>
    </Layout>
  )
}
