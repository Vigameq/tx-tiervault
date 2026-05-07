import * as admin from 'firebase-admin';
import express from 'express';
import { db } from '../config/firebase';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply JSON body parser for this router
router.use(express.json());

/**
 * Create new tenant (system admin only)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    // Only system admin can create tenants
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create tenants' });
    }

    const { name, domain, storageLimit } = req.body;

    const tenantData = {
      name,
      domain,
      storageLimit: storageLimit || 10737418240, // 10GB default
      storageUsed: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const tenantRef = await db.collection('tenants').add(tenantData);

    res.status(201).json({
      message: 'Tenant created successfully',
      tenantId: tenantRef.id,
    });
  } catch (error: any) {
    console.error('Tenant creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get tenant by ID
 */
router.get('/:tenantId', authenticate, async (req, res) => {
  try {
    const { tenantId } = req.params;

    // User can only access their own tenant
    if (tenantId !== req.user?.tenantId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();

    if (!tenantDoc.exists) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ id: tenantDoc.id, ...tenantDoc.data() });
  } catch (error: any) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
