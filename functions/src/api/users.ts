import * as admin from 'firebase-admin';
import express from 'express';
import { auth, db } from '../config/firebase';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply JSON body parser for this router
router.use(express.json());

/**
 * Get all users for tenant (admin only)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    // Only admin can list users
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can list users' });
    }

    const usersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .get();

    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ users, count: users.length });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all suppliers for tenant (admin/manager only)
 * NOTE: This must come BEFORE /:userId route to avoid "suppliers" being treated as a userId
 */
router.get('/suppliers', authenticate, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    // Only admin and manager can list suppliers
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const usersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', '==', 'supplier')
      .get();

    const suppliers = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
      displayName: doc.data().displayName,
      assignedFolders: doc.data().assignedFolders || [],
    }));

    res.json({ suppliers, count: suppliers.length });
  } catch (error: any) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user by ID
 */
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData: any = userDoc.data();

    // Check tenant access
    if (userData.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ id: userDoc.id, ...userData });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update user
 */
router.put('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, role, isActive, assignedFolders } = req.body;

    // Only admin can update users
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can update users' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData: any = {
      displayName,
      role,
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Handle assignedFolders for suppliers
    if (role === 'supplier') {
      updateData.assignedFolders = assignedFolders || [];
    } else {
      // Remove assignedFolders if changing from supplier to other role
      updateData.assignedFolders = admin.firestore.FieldValue.delete();
    }

    await db.collection('users').doc(userId).update(updateData);

    res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete user
 */
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Only admin can delete users
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete users' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    // Delete from Firestore
    await db.collection('users').doc(userId).delete();

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current user's profile
 */
router.get('/me/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user!.uid;

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData: any = userDoc.data();

    res.json({
      id: userDoc.id,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      preferences: userData.preferences || {},
      notificationSettings: userData.notificationSettings || {
        emailOnUpload: true,
        emailOnComment: true,
        emailOnShare: true,
        activityDigest: 'weekly',
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update current user's profile
 */
router.patch('/me/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user!.uid;
    const { displayName, preferences, notificationSettings } = req.body;

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (displayName !== undefined) {
      updateData.displayName = displayName.trim();
    }

    if (preferences !== undefined) {
      updateData.preferences = preferences;
    }

    if (notificationSettings !== undefined) {
      updateData.notificationSettings = notificationSettings;
    }

    await db.collection('users').doc(userId).update(updateData);

    res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Change current user's password
 */
router.post('/me/change-password', authenticate, async (req, res) => {
  try {
    const userId = req.user!.uid;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Update password in Firebase Auth
    await auth.updateUser(userId, {
      password: newPassword,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
