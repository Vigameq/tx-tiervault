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
    // Suppliers cannot create folders
    if (req.user!.role === 'supplier') {
      return res.status(403).json({ error: 'Suppliers cannot create folders' });
    }

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

    // For suppliers: only show assigned folders
    if (req.user!.role === 'supplier') {
      const userDoc = await db.collection('users').doc(req.user!.uid).get();
      const userData = userDoc.data();
      const assignedFolders = userData?.assignedFolders || [];

      if (assignedFolders.length === 0) {
        return res.json({ folders: [], count: 0 });
      }

      // If specific parentId requested, check access
      if (parentId && !assignedFolders.includes(parentId as string)) {
        return res.status(403).json({ error: 'Access denied to this folder' });
      }

      // Fetch only assigned folders
      const foldersSnap = await db.collection('folders')
        .where('tenantId', '==', tenantId)
        .where(admin.firestore.FieldPath.documentId(), 'in', assignedFolders)
        .get();

      const folders = foldersSnap.docs.map((doc) => {
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

    // For non-suppliers: normal access
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

      const folderIds = snapshot.docs.map(doc => doc.id);

      // Get sharing information for all folders
      const sharingInfo: Record<string, Array<{id: string, displayName: string, email: string}>> = {};

      if (folderIds.length > 0) {
        // Find all users who have these folders in their assignedFolders
        const usersSnap = await db.collection('users')
          .where('tenantId', '==', tenantId)
          .where('role', '==', 'supplier')
          .get();

        usersSnap.docs.forEach(userDoc => {
          const userData = userDoc.data();
          const assignedFolders = userData.assignedFolders || [];

          assignedFolders.forEach((folderId: string) => {
            if (folderIds.includes(folderId)) {
              if (!sharingInfo[folderId]) {
                sharingInfo[folderId] = [];
              }
              sharingInfo[folderId].push({
                id: userDoc.id,
                displayName: userData.displayName,
                email: userData.email,
              });
            }
          });
        });
      }

      const folders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          sharedWith: sharingInfo[doc.id] || [],
        };
      });

      return res.json({ folders, count: folders.length });
    }

    // For 'all', skip orderBy to avoid needing extra index
    const snapshot = await query.get();

    const folderIds = snapshot.docs.map(doc => doc.id);

    // Get sharing information for all folders
    const sharingInfo: Record<string, Array<{id: string, displayName: string, email: string}>> = {};

    if (folderIds.length > 0) {
      const usersSnap = await db.collection('users')
        .where('tenantId', '==', tenantId)
        .where('role', '==', 'supplier')
        .get();

      usersSnap.docs.forEach(userDoc => {
        const userData = userDoc.data();
        const assignedFolders = userData.assignedFolders || [];

        assignedFolders.forEach((folderId: string) => {
          if (folderIds.includes(folderId)) {
            if (!sharingInfo[folderId]) {
              sharingInfo[folderId] = [];
            }
            sharingInfo[folderId].push({
              id: userDoc.id,
              displayName: userData.displayName,
              email: userData.email,
            });
          }
        });
      });
    }

    const folders = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        sharedWith: sharingInfo[doc.id] || [],
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
    // Suppliers cannot rename folders
    if (req.user!.role === 'supplier') {
      return res.status(403).json({ error: 'Suppliers cannot rename folders' });
    }

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
    // Suppliers cannot delete folders
    if (req.user!.role === 'supplier') {
      return res.status(403).json({ error: 'Suppliers cannot delete folders' });
    }

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

/**
 * Share folder with suppliers (manager/admin only)
 */
router.post('/:folderId/share', authenticate, async (req, res) => {
  try {
    // Only manager and admin can share folders
    if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only managers and admins can share folders' });
    }

    const { folderId } = req.params;
    const { userIds } = req.body; // Array of user IDs to share with

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs are required' });
    }

    // Verify folder exists and belongs to tenant
    const folderSnap = await db.collection('folders').doc(folderId).get();
    if (!folderSnap.exists || folderSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update each user's assignedFolders
    const batch = db.batch();
    const errors: string[] = [];

    for (const userId of userIds) {
      const userSnap = await db.collection('users').doc(userId).get();

      if (!userSnap.exists) {
        errors.push(`User ${userId} not found`);
        continue;
      }

      const userData = userSnap.data();

      // Verify user is in same tenant
      if (userData?.tenantId !== req.user?.tenantId) {
        errors.push(`User ${userId} not in same tenant`);
        continue;
      }

      // Only share with suppliers
      if (userData?.role !== 'supplier') {
        errors.push(`User ${userId} is not a supplier`);
        continue;
      }

      // Add folder to assignedFolders if not already present
      const assignedFolders = userData.assignedFolders || [];
      if (!assignedFolders.includes(folderId)) {
        assignedFolders.push(folderId);
        batch.update(db.collection('users').doc(userId), {
          assignedFolders,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    if (errors.length > 0) {
      return res.status(207).json({
        message: 'Folder shared with some users',
        errors
      });
    }

    res.json({ message: 'Folder shared successfully' });
  } catch (error: any) {
    console.error('Share folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Unshare folder from suppliers (manager/admin only)
 */
router.post('/:folderId/unshare', authenticate, async (req, res) => {
  try {
    // Only manager and admin can unshare folders
    if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only managers and admins can unshare folders' });
    }

    const { folderId } = req.params;
    const { userIds } = req.body; // Array of user IDs to unshare from

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs are required' });
    }

    // Verify folder exists and belongs to tenant
    const folderSnap = await db.collection('folders').doc(folderId).get();
    if (!folderSnap.exists || folderSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update each user's assignedFolders
    const batch = db.batch();

    for (const userId of userIds) {
      const userSnap = await db.collection('users').doc(userId).get();

      if (userSnap.exists) {
        const userData = userSnap.data();
        const assignedFolders = (userData?.assignedFolders || []).filter(
          (id: string) => id !== folderId
        );

        batch.update(db.collection('users').doc(userId), {
          assignedFolders,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    res.json({ message: 'Folder unshared successfully' });
  } catch (error: any) {
    console.error('Unshare folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get users who have access to a folder (manager/admin only)
 */
router.get('/:folderId/shared-with', authenticate, async (req, res) => {
  try {
    // Only manager and admin can view sharing info
    if (req.user!.role !== 'manager' && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { folderId } = req.params;

    // Verify folder exists and belongs to tenant
    const folderSnap = await db.collection('folders').doc(folderId).get();
    if (!folderSnap.exists || folderSnap.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find all users who have this folder in their assignedFolders
    const usersSnap = await db
      .collection('users')
      .where('tenantId', '==', req.user?.tenantId)
      .where('assignedFolders', 'array-contains', folderId)
      .get();

    const users = usersSnap.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
      displayName: doc.data().displayName,
      role: doc.data().role,
    }));

    res.json({ users, count: users.length });
  } catch (error: any) {
    console.error('Get shared users error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
