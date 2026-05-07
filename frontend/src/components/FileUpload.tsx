import { useState, useCallback } from 'react'
import { Upload, X, File, CheckCircle, AlertCircle, FolderUp } from 'lucide-react'
import { toast } from 'sonner'

interface FileUploadProps {
  onUploadComplete?: () => void
  folderId?: string
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

const FileUpload = ({ onUploadComplete, folderId }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)

    // Check if any files are actually folders (would need folder upload logic)
    const actualFiles = files.filter(file => file.type !== '' || file.size > 0)

    if (actualFiles.length === 0) {
      toast.error('Please use the "Select Folder" button to upload folders')
      return
    }

    handleFiles(actualFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }, [])

  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFolderUpload(files)
    }
  }, [])

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return

    // Supported file extensions
    const supportedExtensions = [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt',
      'jpg', 'jpeg', 'png', 'gif', 'webp',
      'step', 'stp', 'csv', 'html'
    ]

    // Filter files and check for unsupported types
    const validFiles: File[] = []
    const unsupportedFiles: string[] = []

    files.forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension && supportedExtensions.includes(extension)) {
        validFiles.push(file)
      } else {
        unsupportedFiles.push(file.name)
      }
    })

    // Show warning for unsupported files
    if (unsupportedFiles.length > 0) {
      toast.error(
        `Unsupported file type: ${unsupportedFiles.join(', ')}. Please upload PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, or STEP files.`,
        { duration: 5000 }
      )
    }

    // Only proceed if there are valid files
    if (validFiles.length === 0) return

    // Add files to uploading list
    const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
    }))

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles])

    // Upload each file
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      try {
        await uploadFile(file, i)
      } catch (error) {
        console.error('Upload error:', error)
      }
    }

    // Notify parent after all uploads complete
    if (onUploadComplete) {
      onUploadComplete()
    }
  }

  const handleFolderUpload = async (files: File[]) => {
    if (files.length === 0) return

    // Supported file extensions
    const supportedExtensions = [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt',
      'jpg', 'jpeg', 'png', 'gif', 'webp',
      'step', 'stp', 'csv', 'html'
    ]

    // Filter files and check for unsupported types
    const validFiles: File[] = []
    const unsupportedFiles: string[] = []

    files.forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension && supportedExtensions.includes(extension)) {
        validFiles.push(file)
      } else {
        unsupportedFiles.push(file.name)
      }
    })

    // Show warning for unsupported files
    if (unsupportedFiles.length > 0) {
      toast.warning(
        `Skipping ${unsupportedFiles.length} unsupported file(s). Only PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, and STEP files are supported.`,
        { duration: 5000 }
      )
    }

    // Only proceed if there are valid files
    if (validFiles.length === 0) {
      toast.error('No supported files found in the selected folder.')
      return
    }

    // Group files by their folder structure
    const folderMap = new Map<string, File[]>()

    validFiles.forEach((file: any) => {
      const path = file.webkitRelativePath || file.name
      const pathParts = path.split('/')

      // Get the folder path (everything except the filename)
      if (pathParts.length > 1) {
        const folderPath = pathParts.slice(0, -1).join('/')
        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, [])
        }
        folderMap.get(folderPath)!.push(file)
      } else {
        // File at root
        if (!folderMap.has('')) {
          folderMap.set('', [])
        }
        folderMap.get('')!.push(file)
      }
    })

    // Create folders first, then upload files
    const { createFolder } = await import('@/utils/api')
    const folderIdMap = new Map<string, string>()

    // Sort folder paths by depth to create parent folders first
    const folderPaths = Array.from(folderMap.keys()).sort((a, b) => {
      const depthA = a.split('/').length
      const depthB = b.split('/').length
      return depthA - depthB
    })

    // Create folders
    for (const folderPath of folderPaths) {
      if (folderPath === '') continue // Skip root

      const pathParts = folderPath.split('/')
      const folderName = pathParts[pathParts.length - 1]

      // Find parent folder ID
      let parentFolderId = folderId // Use current folder as parent
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/')
        parentFolderId = folderIdMap.get(parentPath) || folderId
      }

      try {
        const result = await createFolder(folderName, parentFolderId)
        folderIdMap.set(folderPath, result.folder.id)
      } catch (error) {
        console.error(`Failed to create folder ${folderPath}:`, error)
      }
    }

    // Add all files to uploading list
    const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
    }))

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles])

    // Upload files to their respective folders
    let fileIndex = 0
    for (const [folderPath, folderFiles] of folderMap.entries()) {
      const targetFolderId = folderPath === '' ? folderId : folderIdMap.get(folderPath)

      for (const file of folderFiles) {
        try {
          await uploadFileToFolder(file, fileIndex, targetFolderId)
          fileIndex++
        } catch (error) {
          console.error('Upload error:', error)
          fileIndex++
        }
      }
    }

    // Notify parent after all uploads complete
    if (onUploadComplete) {
      onUploadComplete()
    }
  }

  const uploadFile = async (file: File, index: number) => {
    const baseIndex = uploadingFiles.length - (uploadingFiles.filter(f => f.status === 'uploading').length)

    try {
      const { uploadDocument } = await import('@/utils/api')

      const result = await uploadDocument(file, {
        folderId: folderId,
        comment: 'Uploaded via web interface',
        onProgress: (progress) => {
          setUploadingFiles((prev) => {
            const updated = [...prev]
            const currentIndex = baseIndex + index
            if (updated[currentIndex]) {
              updated[currentIndex].progress = progress
            }
            return updated
          })
        },
      })

      // Update status to success
      setUploadingFiles((prev) => {
        const updated = [...prev]
        const currentIndex = baseIndex + index
        if (updated[currentIndex]) {
          updated[currentIndex].progress = 100
          updated[currentIndex].status = 'success'
        }
        return updated
      })

      // Show appropriate toast message
      if (result.noChanges) {
        toast.info('No changes detected - file is identical to latest version')
      } else {
        toast.success(`${file.name} uploaded successfully!`)
      }
    } catch (error: any) {
      setUploadingFiles((prev) => {
        const updated = [...prev]
        const currentIndex = baseIndex + index
        if (updated[currentIndex]) {
          updated[currentIndex].status = 'error'
          updated[currentIndex].error = error.message || 'Upload failed'
        }
        return updated
      })

      toast.error(`Failed to upload ${file.name}`)
    }
  }

  const uploadFileToFolder = async (file: File, index: number, targetFolderId?: string) => {
    const baseIndex = uploadingFiles.length - (uploadingFiles.filter(f => f.status === 'uploading').length)

    try {
      const { uploadDocument } = await import('@/utils/api')

      const result = await uploadDocument(file, {
        folderId: targetFolderId,
        comment: 'Uploaded via web interface',
        onProgress: (progress) => {
          setUploadingFiles((prev) => {
            const updated = [...prev]
            const currentIndex = baseIndex + index
            if (updated[currentIndex]) {
              updated[currentIndex].progress = progress
            }
            return updated
          })
        },
      })

      // Update status to success
      setUploadingFiles((prev) => {
        const updated = [...prev]
        const currentIndex = baseIndex + index
        if (updated[currentIndex]) {
          updated[currentIndex].progress = 100
          updated[currentIndex].status = 'success'
        }
        return updated
      })

      // Show appropriate toast message (only for last file to avoid spam)
      if (index === uploadingFiles.length - 1) {
        toast.success('Folder uploaded successfully!')
      }
    } catch (error: any) {
      setUploadingFiles((prev) => {
        const updated = [...prev]
        const currentIndex = baseIndex + index
        if (updated[currentIndex]) {
          updated[currentIndex].status = 'error'
          updated[currentIndex].error = error.message || 'Upload failed'
        }
        return updated
      })

      toast.error(`Failed to upload ${file.name}`)
    }
  }

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload
          className={`w-12 h-12 mx-auto mb-4 ${
            isDragging ? 'text-blue-500' : 'text-gray-400'
          }`}
        />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, STEP
        </p>
        <div className="flex gap-3 justify-center">
          <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
            <Upload className="w-5 h-5 mr-2" />
            Select Files
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.step,.stp"
            />
          </label>
          <label className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors">
            <FolderUp className="w-5 h-5 mr-2" />
            Select Folder
            <input
              type="file"
              onChange={handleFolderSelect}
              className="hidden"
              {...({ webkitdirectory: '', directory: '' } as any)}
            />
          </label>
        </div>
      </div>

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">
            Uploading {uploadingFiles.filter((f) => f.status === 'uploading').length} file(s)
          </h3>
          {uploadingFiles.map((item, index) => (
            <div
              key={index}
              className="bg-white border rounded-lg p-4 flex items-center space-x-4"
            >
              <div className="flex-shrink-0">
                {item.status === 'uploading' && (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                )}
                {item.status === 'success' && (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="w-8 h-8 text-red-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                  <span className="text-sm text-gray-500">
                    {formatFileSize(item.file.size)}
                  </span>
                </div>

                {item.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                )}

                {item.status === 'success' && (
                  <p className="text-sm text-green-600">Upload complete</p>
                )}

                {item.status === 'error' && (
                  <p className="text-sm text-red-600">{item.error || 'Upload failed'}</p>
                )}
              </div>

              {item.status !== 'uploading' && (
                <button
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUpload
