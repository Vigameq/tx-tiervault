import * as admin from 'firebase-admin';
import express from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../config/firebase';
import { Folder } from '../types';

const router = express.Router();

// Apply JSON body parser for this router
router.use(express.json());

/**
 * Create new folder
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, parentId = null } = req.body;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.uid;

    // Build folder path
    let path = name;
    if (parentId) {
      const parentSnap = await db.collection('folders').doc(parentId).get();
      if (!parentSnap.exists) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
      const parentData = parentSnap.data() as Folder;
      path = `${parentData.path}/${name}`;
    }

    const folderData: Omit<Folder, 'id'> = {
      tenantId,
      name,
      parentId,
      path,
      permissions: [
        {
          userId,
          role: 'owner',
        },
      ],
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    };

    const folderRef = await db.collection('folders').add(folderData);

    res.status(201).json({
      message: 'Folder created successfully',
      folder: { id: folderRef.id, ...folderData },
    });
  } catch (error: any) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all folders for tenant
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { parentId, all } = req.query;
    const tenantId = req.user!.tenantId;

    let query = db.collection('folders').where('tenantId', '==', tenantId);

    // If 'all' parameter is set, return all folders regardless of parent
    // Otherwise, filter by parentId
    if (!all) {
      if (parentId) {
        query = query.where('parentId', '==', parentId);
      } else {
        query = query.where('parentId', '==', null);
      }
      const snapshot = await query.orderBy('createdAt', 'desc').get();

      const folders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        };
      });

      return res.json({ folders, count: folders.length });
    }

    // For 'all', skip orderBy to avoid needing extra index
    const snapshot = await query.get();

    const folders = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    res.json({ folders, count: folders.length });
  } catch (error: any) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get folder by ID
 */
router.get('/:folderId', authenticate, async (req, res) => {
  try {
    const { folderId } = req.params;

    const folderSnap = await db.collection('folders').doc(folderId).get();

    if (!folderSnap.exists) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const folder: any = { id: folderSnap.id, ...folderSnap.data() };

    if (folder.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(folder);
  } catch (error: any) {
    console.error('Get folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Rename folder
 */
router.patch('/:folderId/rename', authenticate, async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const folderSnap = await db.collection('folders').doc(folderId).get();

    if (!folderSnap.exists || folderSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.collection('folders').doc(folderId).update({
      name: name.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Folder renamed successfully' });
  } catch (error: any) {
    console.error('Rename folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update folder
 */
router.put('/:folderId', authenticate, async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;

    const folderSnap = await db.collection('folders').doc(folderId).get();

    if (!folderSnap.exists || folderSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.collection('folders').doc(folderId).update({
      name,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Folder updated successfully' });
  } catch (error: any) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete folder
 */
router.delete('/:folderId', authenticate, async (req, res) => {
  try {
    const { folderId } = req.params;

    const folderSnap = await db.collection('folders').doc(folderId).get();

    if (!folderSnap.exists || folderSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if folder has documents
    const documentsSnap = await db
      .collection('documents')
      .where('folderId', '==', folderId)
      .limit(1)
      .get();

    if (!documentsSnap.empty) {
      return res.status(400).json({ error: 'Cannot delete folder with documents' });
    }

    // Check if folder has subfolders
    const subfoldersSnap = await db
      .collection('folders')
      .where('parentId', '==', folderId)
      .limit(1)
      .get();

    if (!subfoldersSnap.empty) {
      return res.status(400).json({ error: 'Cannot delete folder with subfolders' });
    }

    await db.collection('folders').doc(folderId).delete();

    res.json({ message: 'Folder deleted successfully' });
  } catch (error: any) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
