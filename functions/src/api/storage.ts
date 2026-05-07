import express from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../config/firebase';

const router = express.Router();

/**
 * Get storage usage for tenant
 */
router.get('/usage', authenticate, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get all documents for tenant
    const documentsSnap = await db
      .collection('documents')
      .where('tenantId', '==', tenantId)
      .get();

    let totalBytes = 0;
    let documentCount = 0;

    documentsSnap.docs.forEach((doc) => {
      const data = doc.data();
      totalBytes += data.size || 0;
      documentCount++;
    });

    res.json({
      totalBytes,
      documentCount,
      totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
      totalGB: (totalBytes / (1024 * 1024 * 1024)).toFixed(4),
    });
  } catch (error: any) {
    console.error('Storage usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
