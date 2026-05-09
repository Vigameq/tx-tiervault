import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import FileUpload from '@/components/FileUpload'
import FolderCreate from '@/components/FolderCreate'
import MoveToFolder from '@/components/MoveToFolder'
import DocumentPreview from '@/components/DocumentPreview'
import DocumentVersions from '@/components/DocumentVersions'
import RenameModal from '@/components/RenameModal'
import ActivityLog from '@/components/ActivityLog'
import CommentsPanel from '@/components/CommentsPanel'
import ShareFolderModal from '@/components/ShareFolderModal'
import { FileText, Download, Eye, MoreVertical, Folder, HardDrive, FolderPlus, Home, ChevronRight, Trash2, FolderInput, Info, History, Search, Filter, X as CloseIcon, Edit, Activity, MessageSquare, Share2, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface Document {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  uploadedBy: string
  folderId?: string
  versions: number
  currentVersion: string
}

interface FolderItem {
  id: string
  name: string
  path: string
  parentId?: string
  createdAt: Date
  sharedWith?: Array<{
    id: string
    displayName: string
    email: string
  }>
}

const Documents = () => {
  const user = useAuthStore((state) => state.user)
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [allFolders, setAllFolders] = useState<FolderItem[]>([]) // Store all folders for path building
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showMoveDocument, setShowMoveDocument] = useState<{id: string, name: string} | null>(null)
  const [showPreview, setShowPreview] = useState<{id: string, name: string, versionId?: string, versionNumber?: string} | null>(null)
  const [showVersions, setShowVersions] = useState<{id: string, name: string} | null>(null)
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, type: 'folder' | 'document', id: string} | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'version'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showRename, setShowRename] = useState<{type: 'document' | 'folder', id: string, name: string} | null>(null)
  const [storageUsed, setStorageUsed] = useState(0)
  const [showActivity, setShowActivity] = useState<{id: string, name: string} | null>(null)
  const [showComments, setShowComments] = useState<{id: string, name: string} | null>(null)
  const [showShareFolder, setShowShareFolder] = useState<{id: string, name: string} | null>(null)

  useEffect(() => {
    fetchData()
  }, [currentFolderId])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([fetchDocuments(), fetchFolders(), fetchAllFolders(), fetchStorageUsage()])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStorageUsage = async () => {
    try {
      const { getStorageUsage } = await import('@/utils/api')
      const usage = await getStorageUsage()
      setStorageUsed(usage.totalBytes)
    } catch (error) {
      console.error('Error fetching storage:', error)
    }
  }

  const fetchAllFolders = async () => {
    try {
      const { getFolders: fetchFolds } = await import('@/utils/api')
      // Fetch all folders (not filtered by parent) for path building
      const response = await fetchFolds(undefined, true)

      const allFoldersList = response.folders.map((folder: any) => ({
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        createdAt: new Date(folder.createdAt),
      }))

      setAllFolders(allFoldersList)

      // Build path for current folder
      if (currentFolderId) {
        buildFolderPath(currentFolderId, allFoldersList)
      } else {
        setFolderPath([])
      }
    } catch (error) {
      console.error('Error fetching all folders:', error)
    }
  }

  const buildFolderPath = (folderId: string, foldersList: FolderItem[]) => {
    const path: FolderItem[] = []
    let currentId: string | null = folderId

    while (currentId) {
      const folder = foldersList.find(f => f.id === currentId)
      if (folder) {
        path.unshift(folder)
        currentId = folder.parentId || null
      } else {
        break
      }
    }

    setFolderPath(path)
  }

  const fetchDocuments = async () => {
    try {
      const { getDocuments: fetchDocs } = await import('@/utils/api')
      const response = await fetchDocs(currentFolderId || undefined)

      const docs = response.documents.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size || 0,
        type: doc.mimeType || doc.type,
        uploadedAt: doc.createdAt?.toDate?.() || new Date(doc.createdAt),
        uploadedBy: doc.uploadedByName || doc.uploadedBy,
        folderId: doc.folderId,
        versions: doc.versionCount || 1,
        currentVersion: doc.currentVersion || '1.0.0',
      }))

      setDocuments(docs)
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const fetchFolders = async () => {
    try {
      const { getFolders: fetchFolds } = await import('@/utils/api')
      const response = await fetchFolds(currentFolderId || undefined)

      const folds = response.folders.map((folder: any) => ({
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        createdAt: new Date(folder.createdAt),
        sharedWith: folder.sharedWith || [],
      }))

      setFolders(folds)
    } catch (error) {
      console.error('Error fetching folders:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const handleUploadComplete = async () => {
    // Small delay to ensure backend has processed everything
    await new Promise(resolve => setTimeout(resolve, 500))

    // Refresh both documents and folders (in case folders were created during upload)
    await Promise.all([fetchDocuments(), fetchFolders(), fetchAllFolders()])
    setShowUpload(false)
  }

  const handleFolderCreated = () => {
    fetchFolders()
    fetchAllFolders()
  }

  const openFolder = (folderId: string) => {
    setCurrentFolderId(folderId)
    buildFolderPath(folderId, allFolders)
  }

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId)
    if (folderId) {
      buildFolderPath(folderId, allFolders)
    } else {
      setFolderPath([])
    }
  }

  const goToRoot = () => {
    setCurrentFolderId(null)
    setFolderPath([])
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return

    try {
      const { deleteFolder } = await import('@/utils/api')
      await deleteFolder(folderId)
      await fetchFolders()
      const { toast } = await import('sonner')
      toast.success('Folder deleted successfully')
    } catch (error: any) {
      const { toast } = await import('sonner')

      // Parse error message from response
      let errorMessage = 'Failed to delete folder'
      if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const { deleteDocument } = await import('@/utils/api')
      await deleteDocument(documentId)
      await fetchDocuments()
      const { toast } = await import('sonner')
      toast.success('Document deleted successfully')
    } catch (error: any) {
      const { toast } = await import('sonner')
      toast.error(error.message || 'Failed to delete document')
    }
  }

  const handleMoveDocument = (documentId: string, documentName: string) => {
    setShowMoveDocument({ id: documentId, name: documentName })
  }

  const handleMoved = async () => {
    // Refresh documents to reflect the move
    await fetchDocuments()
  }

  const handleContextMenu = (e: React.MouseEvent, type: 'folder' | 'document', id: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, type, id })
  }

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('doc')) return '📝'
    if (type.includes('excel') || type.includes('sheet')) return '📊'
    if (type.includes('image')) return '🖼️'
    if (type.includes('text')) return '📃'
    if (type.includes('step') || type.includes('stp')) return '🔧'
    return '📎'
  }

  const handleDownload = async (documentId: string) => {
    try {
      const { toast } = await import('sonner')
      toast.info('Preparing download...')

      const { downloadDocument } = await import('@/utils/api')
      await downloadDocument(documentId)

      toast.success('Download started')
    } catch (error: any) {
      console.error('Download error:', error)
      const { toast } = await import('sonner')
      toast.error(error.message || 'Failed to download document')
    }
  }

  const handlePreview = (documentId: string, documentName: string) => {
    setShowPreview({ id: documentId, name: documentName })
  }

  const handlePreviewVersion = (documentId: string, documentName: string, versionId: string, versionNumber: string) => {
    setShowVersions(null) // Close versions modal
    setShowPreview({ id: documentId, name: documentName, versionId, versionNumber })
  }

  const handleShowVersions = (documentId: string, documentName: string) => {
    setShowVersions({ id: documentId, name: documentName })
  }

  const handleRenameComplete = async () => {
    await Promise.all([fetchDocuments(), fetchFolders(), fetchAllFolders()])
  }

  // Filter and search documents
  const filteredDocuments = documents.filter((doc) => {
    // Search filter
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())

    // Type filter
    const matchesType = filterType === 'all' || doc.type.toLowerCase().includes(filterType.toLowerCase())

    return matchesSearch && matchesType
  }).sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'size':
        comparison = a.size - b.size
        break
      case 'date':
        comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
        break
      case 'version':
        comparison = a.currentVersion.localeCompare(b.currentVersion)
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Filter folders
  const filteredFolders = folders.filter((folder) => {
    return folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  }).sort((a, b) => {
    const comparison = sortBy === 'name'
      ? a.name.localeCompare(b.name)
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

    return sortOrder === 'asc' ? comparison : -comparison
  })

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="mt-2 text-gray-600">
              Manage and organize your documents
            </p>
          </div>
          {user?.role !== 'supplier' && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateFolder(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <FolderPlus className="w-5 h-5 mr-2" />
                New Folder
              </button>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <FileText className="w-5 h-5 mr-2" />
                {showUpload ? 'Hide Upload' : 'Upload Documents'}
              </button>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-4 flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Documents</p>
              <p className="text-2xl font-semibold text-gray-900">{documents.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center">
            <div className="bg-green-100 rounded-lg p-3">
              <Folder className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Folders</p>
              <p className="text-2xl font-semibold text-gray-900">{folders.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center">
            <div className="bg-purple-100 rounded-lg p-3">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Storage Used</p>
              <p className="text-2xl font-semibold text-gray-900">{formatFileSize(storageUsed)}</p>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center text-sm text-gray-600 flex-wrap">
            <button
              onClick={goToRoot}
              className={`hover:text-blue-600 flex items-center ${!currentFolderId ? 'text-blue-600 font-medium' : ''}`}
            >
              <Home className="w-4 h-4 mr-1" />
              Home
            </button>

            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                <ChevronRight className="w-4 h-4 mx-2" />
                <button
                  onClick={() => navigateToFolder(folder.id)}
                  className={`hover:text-blue-600 ${
                    index === folderPath.length - 1
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-600'
                  }`}
                >
                  <Folder className="w-4 h-4 inline mr-1 text-yellow-500" />
                  {folder.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload New Documents{currentFolderId ? ' to Current Folder' : ''}
            </h2>
            <FileUpload
              onUploadComplete={handleUploadComplete}
              folderId={currentFolderId || undefined}
            />
          </div>
        )}

        {/* Folder Create Modal */}
        {showCreateFolder && (
          <FolderCreate
            onClose={() => setShowCreateFolder(false)}
            onFolderCreated={handleFolderCreated}
            parentId={currentFolderId || undefined}
          />
        )}

        {/* Move Document Modal */}
        {showMoveDocument && (
          <MoveToFolder
            documentId={showMoveDocument.id}
            documentName={showMoveDocument.name}
            currentFolderId={currentFolderId || undefined}
            onClose={() => setShowMoveDocument(null)}
            onMoved={handleMoved}
          />
        )}

        {/* Document Preview Modal */}
        {showPreview && (
          <DocumentPreview
            documentId={showPreview.id}
            documentName={showPreview.name}
            versionId={showPreview.versionId}
            versionNumber={showPreview.versionNumber}
            onClose={() => setShowPreview(null)}
          />
        )}

        {/* Document Versions Modal */}
        {showVersions && (
          <DocumentVersions
            documentId={showVersions.id}
            documentName={showVersions.name}
            onClose={() => setShowVersions(null)}
            onPreviewVersion={(versionId, versionNumber) =>
              handlePreviewVersion(showVersions.id, showVersions.name, versionId, versionNumber)
            }
          />
        )}

        {/* Rename Modal */}
        {showRename && (
          <RenameModal
            type={showRename.type}
            id={showRename.id}
            currentName={showRename.name}
            onClose={() => setShowRename(null)}
            onRenamed={handleRenameComplete}
          />
        )}

        {/* Activity Log Modal */}
        {showActivity && (
          <ActivityLog
            documentId={showActivity.id}
            documentName={showActivity.name}
            onClose={() => setShowActivity(null)}
          />
        )}

        {/* Comments Panel */}
        {showComments && (
          <CommentsPanel
            documentId={showComments.id}
            documentName={showComments.name}
            onClose={() => setShowComments(null)}
          />
        )}

        {/* Share Folder Modal */}
        {showShareFolder && (
          <ShareFolderModal
            folder={{id: showShareFolder.id, name: showShareFolder.name}}
            onClose={() => setShowShareFolder(null)}
            onSuccess={() => {
              setShowShareFolder(null)
              fetchData()
            }}
          />
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="text-sm font-medium text-gray-700">File Type:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="doc">Documents (DOC, DOCX)</option>
                  <option value="xls">Spreadsheets (XLS, XLSX)</option>
                  <option value="image">Images</option>
                  <option value="step">STEP Files</option>
                  <option value="text">Text Files</option>
                </select>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="text-sm font-medium text-gray-700">Sort By:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                  <option value="date">Date</option>
                  <option value="version">Version</option>
                </select>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>

                {(searchQuery || filterType !== 'all' || sortBy !== 'date' || sortOrder !== 'desc') && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterType('all')
                      setSortBy('date')
                      setSortOrder('desc')
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Reset all
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results count */}
          {(searchQuery || filterType !== 'all') && (
            <div className="mt-3 text-sm text-gray-600">
              Found {filteredDocuments.length} document(s) and {filteredFolders.length} folder(s)
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">All Documents</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-1.5 rounded ${
                    view === 'list'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setView('grid')}
                  className={`px-3 py-1.5 rounded ${
                    view === 'grid'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Grid
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 && filteredFolders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-sm mb-4">Upload your first document to get started!</p>
              {!showUpload && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Upload Documents
                </button>
              )}
            </div>
          ) : view === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Folders */}
                  {filteredFolders.map((folder) => (
                    <tr
                      key={folder.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => openFolder(folder.id)}
                      onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap" colSpan={4}>
                        <div className="flex items-center">
                          <Folder className="w-6 h-6 text-yellow-500 mr-3" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                              {folder.sharedWith && folder.sharedWith.length > 0 && (
                                <div
                                  className="group relative inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full cursor-help"
                                  title={`Shared with: ${folder.sharedWith.map(s => s.displayName).join(', ')}`}
                                >
                                  <Users className="w-3 h-3" />
                                  <span>{folder.sharedWith.length}</span>
                                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-48 bg-gray-900 text-white text-xs rounded py-2 px-3">
                                    <div className="font-semibold mb-1">Shared with:</div>
                                    {folder.sharedWith.map((supplier) => (
                                      <div key={supplier.id} className="py-0.5">
                                        {supplier.displayName}
                                      </div>
                                    ))}
                                    <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{folder.path}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          {(user?.role === 'admin' || user?.role === 'manager') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowShareFolder({id: folder.id, name: folder.name})
                              }}
                              className="p-2 hover:bg-blue-50 rounded text-blue-600"
                              title="Share folder"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          {user?.role !== 'supplier' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowRename({type: 'folder', id: folder.id, name: folder.name})
                                }}
                                className="p-2 hover:bg-green-50 rounded text-green-600"
                                title="Rename folder"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteFolder(folder.id)
                                }}
                                className="p-2 hover:bg-red-50 rounded text-red-600"
                                title="Delete folder"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Documents */}
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50"
                      onContextMenu={(e) => handleContextMenu(e, 'document', doc.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{getFileIcon(doc.type)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                            <div className="text-sm text-gray-500">{doc.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        v{doc.currentVersion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePreview(doc.id, doc.name)}
                            className="p-2 hover:bg-purple-50 rounded text-purple-600"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShowVersions(doc.id, doc.name)}
                            className="p-2 hover:bg-orange-50 rounded text-orange-600"
                            title="Version history"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {user?.role !== 'supplier' && (
                            <>
                              <button
                                onClick={() => setShowRename({type: 'document', id: doc.id, name: doc.name})}
                                className="p-2 hover:bg-green-50 rounded text-green-600"
                                title="Rename"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveDocument(doc.id, doc.name)}
                                className="p-2 hover:bg-blue-50 rounded text-blue-600"
                                title="Move to folder"
                              >
                                <FolderInput className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setShowActivity({id: doc.id, name: doc.name})}
                            className="p-2 hover:bg-indigo-50 rounded text-indigo-600"
                            title="Activity log"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowComments({id: doc.id, name: doc.name})}
                            className="p-2 hover:bg-cyan-50 rounded text-cyan-600"
                            title="Comments"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(doc.id)}
                            className="p-2 hover:bg-gray-100 rounded"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-gray-600" />
                          </button>
                          {doc.versions <= 1 ? (
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-2 hover:bg-red-50 rounded text-red-600"
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-2 rounded text-gray-300 cursor-not-allowed"
                              title="Use version history to delete specific versions"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Folders in grid */}
              {filteredFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative group"
                  onClick={() => openFolder(folder.id)}
                  onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100">
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowShareFolder({id: folder.id, name: folder.name})
                        }}
                        className="p-1 hover:bg-blue-50 rounded text-blue-600"
                        title="Share folder"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                    {user?.role !== 'supplier' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowRename({type: 'folder', id: folder.id, name: folder.name})
                          }}
                          className="p-1 hover:bg-green-50 rounded text-green-600"
                          title="Rename folder"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFolder(folder.id)
                          }}
                          className="p-1 hover:bg-red-50 rounded text-red-600"
                          title="Delete folder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="text-center mb-3">
                    <Folder className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{folder.name}</h3>
                      {folder.sharedWith && folder.sharedWith.length > 0 && (
                        <div
                          className="group relative inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full cursor-help flex-shrink-0"
                          title={`Shared with: ${folder.sharedWith.map(s => s.displayName).join(', ')}`}
                        >
                          <Users className="w-3 h-3" />
                          <span>{folder.sharedWith.length}</span>
                          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 w-48 bg-gray-900 text-white text-xs rounded py-2 px-3">
                            <div className="font-semibold mb-1">Shared with:</div>
                            {folder.sharedWith.map((supplier) => (
                              <div key={supplier.id} className="py-0.5">
                                {supplier.displayName}
                              </div>
                            ))}
                            <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {formatDate(folder.createdAt)}
                  </div>
                </div>
              ))}
              {/* Documents in grid */}
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative group"
                  onContextMenu={(e) => handleContextMenu(e, 'document', doc.id)}
                >
                  {doc.versions <= 1 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteDocument(doc.id)
                      }}
                      className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded text-red-600"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 rounded text-gray-300 cursor-not-allowed"
                      title="Use version history to delete specific versions"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="text-center mb-3">
                    <div className="text-5xl mb-2">{getFileIcon(doc.type)}</div>
                    <h3 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h3>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span>Size:</span>
                      <span>{formatFileSize(doc.size)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Version:</span>
                      <span>v{doc.currentVersion}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Uploaded:</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreview(doc.id, doc.name)
                      }}
                      className="p-2 hover:bg-purple-50 rounded text-purple-600"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShowVersions(doc.id, doc.name)
                      }}
                      className="p-2 hover:bg-orange-50 rounded text-orange-600"
                      title="Version history"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    {user?.role !== 'supplier' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveDocument(doc.id, doc.name)
                        }}
                        className="p-2 hover:bg-blue-50 rounded text-blue-600"
                        title="Move to folder"
                      >
                        <FolderInput className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowActivity({id: doc.id, name: doc.name})
                      }}
                      className="p-2 hover:bg-indigo-50 rounded text-indigo-600"
                      title="Activity log"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowComments({id: doc.id, name: doc.name})
                      }}
                      className="p-2 hover:bg-cyan-50 rounded text-cyan-600"
                      title="Comments"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(doc.id)
                      }}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default Documents
