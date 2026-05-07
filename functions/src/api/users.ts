import * as admin from 'firebase-admin';
import express from 'express';
import { auth, db } from '../config/firebase';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply JSON body parser for this router
router.use(express.json());

/**
 * Get all users for tenant (admin/manager only)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    // Only admin and manager can list users
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
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
    const { displayName, role, isActive } = req.body;

    // Only admin and manager can update users
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.tenantId !== req.user?.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.collection('users').doc(userId).update({
      displayName,
      role,
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

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

export default router;
