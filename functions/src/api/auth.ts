import * as admin from 'firebase-admin';
import express from 'express';
import { auth, db } from '../config/firebase';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply JSON body parser for this router
router.use(express.json());

/**
 * Register new user (tenant admin creates users)
 */
router.post('/register', authenticate, async (req, res) => {
  try {
    const { email, password, displayName, role = 'viewer' } = req.body;
    const tenantId = req.user?.tenantId;

    // Only admin and manager can create users
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Create Firebase user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      tenantId,
      role,
      displayName: displayName || email.split('@')[0],
      email,
      isActive: true,
      lastLoginAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      message: 'User created successfully',
      userId: userRecord.uid,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current user profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;

    const userDoc = await db.collection('users').doc(userId!).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: userDoc.id, ...userDoc.data() });
  } catch (error: any) {
    console.error('Profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { displayName } = req.body;

    await db.collection('users').doc(userId!).update({
      displayName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update last login timestamp
 */
router.post('/login', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;

    await db.collection('users').doc(userId!).update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Login recorded' });
  } catch (error: any) {
    console.error('Login record error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
