import * as admin from 'firebase-admin';
import express from 'express';
import Busboy from 'busboy';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createDocument, createDocumentVersion, getDocumentVersions } from '../services/documentService';
import { getSignedUrl } from '../utils/storage';
import { db } from '../config/firebase';

const router = express.Router();

/**
 * Upload new document
 * Handle multipart manually without middleware to work with Firebase Functions
 */
router.post('/upload', authenticate, (req: AuthRequest, res) => {
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 1
    }
  });

  let fileBuffer: Buffer | null = null;
  let fileName = '';
  let folderId: string | null = null;
  let comment = 'Initial version';
  let fileProcessed = false;

  busboy.on('file', (fieldname, file, info) => {
    console.log('Busboy file event:', fieldname, info.filename);
    fileName = info.filename;
    const chunks: Buffer[] = [];

    file.on('data', (chunk) => {
      chunks.push(chunk);
    });

    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
      fileProcessed = true;
      console.log('File buffered:', fileBuffer.length, 'bytes');
    });

    file.on('error', (err) => {
      console.error('File stream error:', err);
    });
  });

  busboy.on('field', (fieldname, value) => {
    console.log('Busboy field:', fieldname, value);
    if (fieldname === 'folderId') folderId = value;
    if (fieldname === 'comment') comment = value;
  });

  busboy.on('error', (error: any) => {
    console.error('Busboy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'File upload parsing error: ' + error.message });
    }
  });

  busboy.on('finish', async () => {
    console.log('Busboy finish event');
    try {
      if (!fileBuffer || !fileName) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Check if a document with the same name already exists in the same folder
      let existingDocQuery = db
        .collection('documents')
        .where('tenantId', '==', req.user!.tenantId)
        .where('name', '==', fileName);

      // Filter by folder location
      if (folderId) {
        existingDocQuery = existingDocQuery.where('folderId', '==', folderId);
      } else {
        existingDocQuery = existingDocQuery.where('folderId', '==', null);
      }

      const existingDocs = await existingDocQuery.limit(1).get();

      // If document exists, create a new version instead of a new document
      if (!existingDocs.empty) {
        const existingDoc = existingDocs.docs[0];
        console.log('Found existing document:', existingDoc.id, '- creating new version');

        try {
          const version = await createDocumentVersion(
            existingDoc.id,
            req.user!.uid,
            fileBuffer,
            comment
          );

          return res.status(201).json({
            message: 'New version created successfully',
            document: { id: existingDoc.id, ...existingDoc.data() },
            version,
          });
        } catch (versionError: any) {
          // If no changes detected, return success with informational message
          if (versionError.message && versionError.message.includes('No changes detected')) {
            return res.status(200).json({
              message: 'No changes detected - file is identical to latest version',
              document: { id: existingDoc.id, ...existingDoc.data() },
              noChanges: true,
            });
          }
          throw versionError;
        }
      }

      // No existing document - create new one
      const result = await createDocument(
        req.user!.tenantId,
        req.user!.uid,
        fileName,
        fileBuffer,
        folderId,
        comment
      );

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: result.document,
        version: result.version,
      });
    } catch (error: any) {
      console.error('Document creation error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Pipe the raw request to busboy
  const rawBody = (req as any).rawBody;
  rawBody ? busboy.end(rawBody) : req.pipe(busboy);
});

/**
 * Upload new version of existing document
 */
router.post('/:documentId/versions', authenticate, (req: AuthRequest, res) => {
  const { documentId } = req.params;

  const busboy = Busboy({
    headers: req.headers,
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 1
    }
  });

  let fileBuffer: Buffer | null = null;
  let comment = 'Updated version';

  busboy.on('file', (fieldname, file, info) => {
    const chunks: Buffer[] = [];
    file.on('data', (chunk) => chunks.push(chunk));
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  busboy.on('field', (fieldname, value) => {
    if (fieldname === 'comment') comment = value;
  });

  busboy.on('error', (error: any) => {
    console.error('Busboy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'File upload parsing error: ' + error.message });
    }
  });

  busboy.on('finish', async () => {
    try {
      if (!fileBuffer) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const version = await createDocumentVersion(
        documentId,
        req.user!.uid,
        fileBuffer,
        comment
      );

      res.status(201).json({
        message: 'New version created successfully',
        version,
      });
    } catch (error: any) {
      console.error('Version upload error:', error);

      if (error.message && error.message.includes('No changes detected')) {
        return res.status(409).json({ error: error.message });
      }

      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  const rawBody = (req as any).rawBody;
  rawBody ? busboy.end(rawBody) : req.pipe(busboy);
});

/**
 * Get document by ID
 */
router.get('/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;

    const docSnap = await db.collection('documents').doc(documentId).get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document: any = { id: docSnap.id, ...docSnap.data() };

    // Check tenant access
    if (document.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(document);
  } catch (error: any) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all documents for tenant
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { folderId } = req.query;

    // For suppliers: only show documents in assigned folders
    if (req.user!.role === 'supplier') {
      const userDoc = await db.collection('users').doc(req.user!.uid).get();
      const userData = userDoc.data();
      const assignedFolders = userData?.assignedFolders || [];

      if (assignedFolders.length === 0) {
        // No folders assigned, return empty
        return res.json({ documents: [], count: 0 });
      }

      // If specific folderId requested, check if it's in assignedFolders
      if (folderId && !assignedFolders.includes(folderId as string)) {
        return res.status(403).json({ error: 'Access denied to this folder' });
      }

      // Query documents in assigned folders
      let query = db
        .collection('documents')
        .where('tenantId', '==', req.user!.tenantId);

      if (folderId) {
        query = query.where('folderId', '==', folderId);
      } else {
        // Show documents from all assigned folders at root level
        query = query.where('folderId', 'in', assignedFolders);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();

      const documents = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const versionsSnap = await db
            .collection('documentVersions')
            .where('documentId', '==', doc.id)
            .get();

          return {
            id: doc.id,
            ...data,
            versionCount: versionsSnap.size,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          };
        })
      );

      return res.json({ documents, count: documents.length });
    }

    // For non-suppliers: ownership-based access
    // Admin sees all, others see only owned documents + documents in shared folders
    if (req.user!.role === 'admin') {
      // Admin sees everything
      let query = db
        .collection('documents')
        .where('tenantId', '==', req.user!.tenantId);

      // Filter by folder - if folderId is provided, show only documents in that folder
      // If no folderId, show only root-level documents (where folderId is null)
      if (folderId) {
        query = query.where('folderId', '==', folderId);
      } else {
        query = query.where('folderId', '==', null);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();

      // Fetch version counts for all documents
      const documents = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();

          // Get version count for this document
          const versionsSnap = await db
            .collection('documentVersions')
            .where('documentId', '==', doc.id)
            .get();

          return {
            id: doc.id,
            ...data,
            versionCount: versionsSnap.size,
            // Convert Firestore Timestamps to ISO strings for frontend
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          };
        })
      );

      return res.json({ documents, count: documents.length });
    } else {
      // Non-admin: see only owned documents + documents in shared folders
      const userDoc = await db.collection('users').doc(req.user!.uid).get();
      const userData = userDoc.data();
      const sharedFolderIds = userData?.assignedFolders || [];

      // Get documents owned by user OR in shared folders
      let ownedDocsSnap;
      if (folderId) {
        // Check if user has access to this folder
        const folderDoc = await db.collection('folders').doc(folderId as string).get();
        if (!folderDoc.exists) {
          return res.status(404).json({ error: 'Folder not found' });
        }
        const folderData = folderDoc.data();
        const hasAccess = folderData?.createdBy === req.user!.uid ||
                         sharedFolderIds.includes(folderId as string);

        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied to this folder' });
        }

        // Fetch documents in this folder
        ownedDocsSnap = await db.collection('documents')
          .where('tenantId', '==', req.user!.tenantId)
          .where('folderId', '==', folderId)
          .orderBy('createdAt', 'desc')
          .get();
      } else {
        // Root level: fetch owned documents + documents in shared folders
        ownedDocsSnap = await db.collection('documents')
          .where('tenantId', '==', req.user!.tenantId)
          .where('createdBy', '==', req.user!.uid)
          .where('folderId', '==', null)
          .orderBy('createdAt', 'desc')
          .get();
      }

      const documents = await Promise.all(
        ownedDocsSnap.docs.map(async (doc) => {
          const data = doc.data();

          const versionsSnap = await db
            .collection('documentVersions')
            .where('documentId', '==', doc.id)
            .get();

          return {
            id: doc.id,
            ...data,
            versionCount: versionsSnap.size,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          };
        })
      );

      return res.json({ documents, count: documents.length });
    }
  } catch (error: any) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get document versions
 */
router.get('/:documentId/versions', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;

    // Verify access
    const docSnap = await db.collection('documents').doc(documentId).get();
    if (!docSnap.exists || docSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const versions = await getDocumentVersions(documentId);

    res.json({ versions, count: versions.length });
  } catch (error: any) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Download document (get signed URL)
 */
router.get('/:documentId/download', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { versionId } = req.query;

    console.log('Download request for document:', documentId, 'versionId:', versionId);

    const docSnap = await db.collection('documents').doc(documentId).get();

    if (!docSnap.exists) {
      console.error('Document not found:', documentId);
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docSnap.data()?.tenantId !== req.user?.tenantId) {
      console.error('Access denied - tenant mismatch');
      return res.status(403).json({ error: 'Access denied' });
    }

    let fileKey: string;

    if (versionId) {
      const versionSnap = await db.collection('documentVersions').doc(versionId as string).get();
      if (!versionSnap.exists) {
        console.error('Version not found:', versionId);
        return res.status(404).json({ error: 'Version not found' });
      }
      fileKey = versionSnap.data()?.fileKey;
    } else {
      const latestVersionId = docSnap.data()?.latestVersionId;
      console.log('Latest version ID:', latestVersionId);

      if (!latestVersionId) {
        console.error('No latest version ID found for document:', documentId);
        return res.status(500).json({ error: 'No version found for document' });
      }

      const versionSnap = await db.collection('documentVersions').doc(latestVersionId).get();

      if (!versionSnap.exists) {
        console.error('Latest version document not found:', latestVersionId);
        return res.status(500).json({ error: 'Version data not found' });
      }

      fileKey = versionSnap.data()?.fileKey;
    }

    if (!fileKey) {
      console.error('No fileKey found in version data');
      return res.status(500).json({ error: 'File key not found' });
    }

    console.log('Generating signed URL for fileKey:', fileKey);
    const signedUrl = await getSignedUrl(fileKey);
    console.log('Signed URL generated successfully');

    // Log download audit - only include versionId if it exists
    const auditData: any = {
      tenantId: req.user!.tenantId,
      userId: req.user!.uid,
      action: 'download',
      resourceType: 'document',
      resourceId: documentId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Only add metadata if versionId is provided
    if (versionId) {
      auditData.metadata = { versionId };
    }

    await db.collection('auditLogs').add(auditData);

    res.json({ downloadUrl: signedUrl });
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate download URL' });
  }
});

/**
 * Rename document
 */
router.patch('/:documentId/rename', authenticate, async (req, res) => {
  try {
    // Suppliers cannot rename documents
    if (req.user!.role === 'supplier') {
      return res.status(403).json({ error: 'Suppliers cannot rename documents' });
    }

    const { documentId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const docSnap = await db.collection('documents').doc(documentId).get();

    if (!docSnap.exists || docSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.collection('documents').doc(documentId).update({
      name: name.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Document renamed successfully' });
  } catch (error: any) {
    console.error('Rename document error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Move document to folder
 */
router.patch('/:documentId/move', authenticate, async (req, res) => {
  try {
    // Suppliers cannot move documents
    if (req.user!.role === 'supplier') {
      return res.status(403).json({ error: 'Suppliers cannot move documents' });
    }

    const { documentId } = req.params;
    const { folderId } = req.body;

    const docSnap = await db.collection('documents').doc(documentId).get();

    if (!docSnap.exists || docSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.collection('documents').doc(documentId).update({
      folderId: folderId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Document moved successfully' });
  } catch (error: any) {
    console.error('Move document error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get activity log for document
 */
router.get('/:documentId/activity', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;

    // Verify document access
    const docSnap = await db.collection('documents').doc(documentId).get();
    if (!docSnap.exists || docSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get audit logs for this document
    const logsSnap = await db
      .collection('auditLogs')
      .where('resourceType', '==', 'document')
      .where('resourceId', '==', documentId)
      .get();

    const activities = logsSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          action: data.action,
          userId: data.userId,
          userName: data.userName || 'Unknown User',
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
          metadata: data.metadata,
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA; // descending order
      })
      .slice(0, 50); // limit to 50 most recent

    res.json({ activities, count: activities.length });
  } catch (error: any) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Log document view
 */
router.post('/:documentId/log-view', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;

    // Verify document exists
    const docSnap = await db.collection('documents').doc(documentId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Log view
    await db.collection('auditLogs').add({
      tenantId: req.user!.tenantId,
      userId: req.user!.uid,
      userName: req.user!.email,
      action: 'view',
      resourceType: 'document',
      resourceId: documentId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'View logged' });
  } catch (error: any) {
    console.error('Log view error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a specific version of a document
 */
router.delete('/:documentId/versions/:versionId', authenticate, async (req, res) => {
  try {
    const { documentId, versionId } = req.params;

    // Verify document access
    const docSnap = await db.collection('documents').doc(documentId).get();
    if (!docSnap.exists || docSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check how many versions exist
    const versionsSnap = await db
      .collection('documentVersions')
      .where('documentId', '==', documentId)
      .get();

    if (versionsSnap.size <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only version. Delete the document instead.' });
    }

    // Verify version exists
    const versionSnap = await db.collection('documentVersions').doc(versionId).get();
    if (!versionSnap.exists) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const document = docSnap.data();
    const isLatestVersion = document?.latestVersionId === versionId;

    // Delete the version
    await db.collection('documentVersions').doc(versionId).delete();

    // If deleted version was the latest, update document to point to the new latest
    if (isLatestVersion) {
      const remainingVersionsSnap = await db
        .collection('documentVersions')
        .where('documentId', '==', documentId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!remainingVersionsSnap.empty) {
        const newLatestVersion = remainingVersionsSnap.docs[0];
        const newLatestData = newLatestVersion.data();

        await db.collection('documents').doc(documentId).update({
          latestVersionId: newLatestVersion.id,
          currentVersion: newLatestData.version,
          size: newLatestData.size,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    res.json({ message: 'Version deleted successfully' });
  } catch (error: any) {
    console.error('Delete version error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get comments for a document
 */
router.get('/:documentId/comments', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;

    // Verify document access
    const docSnap = await db.collection('documents').doc(documentId).get();
    if (!docSnap.exists || docSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const commentsSnap = await db
      .collection('comments')
      .where('documentId', '==', documentId)
      .get();

    const comments = commentsSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          userId: data.userId,
          userName: data.userName,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // descending order
      });

    res.json({ comments, count: comments.length });
  } catch (error: any) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add a comment to a document
 */
router.post('/:documentId/comments', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // Verify document access
    const docSnap = await db.collection('documents').doc(documentId).get();
    if (!docSnap.exists || docSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const commentData = {
      documentId,
      tenantId: req.user!.tenantId,
      userId: req.user!.uid,
      userName: req.user!.email,
      text: text.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const commentRef = await db.collection('comments').add(commentData);
    const newComment = await commentRef.get();
    const data = newComment.data();

    res.status(201).json({
      id: commentRef.id,
      text: data?.text,
      userId: data?.userId,
      userName: data?.userName,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a comment
 */
router.delete('/:documentId/comments/:commentId', authenticate, async (req, res) => {
  try {
    const { documentId, commentId } = req.params;

    // Verify document access
    const docSnap = await db.collection('documents').doc(documentId).get();
    if (!docSnap.exists || docSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify comment exists and belongs to user or user is admin
    const commentSnap = await db.collection('comments').doc(commentId).get();
    if (!commentSnap.exists) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = commentSnap.data();
    if (comment?.userId !== req.user!.uid && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Can only delete your own comments' });
    }

    await db.collection('comments').doc(commentId).delete();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error: any) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete document
 */
router.delete('/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;

    const docSnap = await db.collection('documents').doc(documentId).get();

    if (!docSnap.exists || docSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only owner or admin can delete
    const permissions = docSnap.data()?.permissions || [];
    const userPermission = permissions.find((p: any) => p.userId === req.user?.uid);

    if (userPermission?.role !== 'owner' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only document owner or admin can delete' });
    }

    // Soft delete - move to deleted collection
    await db.collection('deletedDocuments').doc(documentId).set({
      ...docSnap.data(),
      deletedBy: req.user!.uid,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('documents').doc(documentId).delete();

    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
