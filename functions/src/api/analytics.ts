import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { db } from '../config/firebase';

const router = express.Router();

/**
 * Get dashboard analytics for tenant
 */
router.get('/dashboard', authenticate, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;

    // Parallel queries for better performance
    const [
      documentsSnap,
      foldersSnap,
      versionsSnap,
      commentsSnap,
      auditLogsSnap,
      usersSnap,
    ] = await Promise.all([
      db.collection('documents').where('tenantId', '==', tenantId).get(),
      db.collection('folders').where('tenantId', '==', tenantId).get(),
      db.collection('documentVersions').get(),
      db.collection('comments').where('tenantId', '==', tenantId).get(),
      db.collection('auditLogs').where('tenantId', '==', tenantId).get(),
      db.collection('users').where('tenantId', '==', tenantId).get(),
    ]);

    // Calculate document statistics
    const documents = documentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const totalDocuments = documents.length;

    // Storage calculation
    let totalStorage = 0;
    documents.forEach((doc: any) => {
      totalStorage += doc.size || 0;
    });

    // Document types breakdown
    const documentTypes: Record<string, number> = {};
    documents.forEach((doc: any) => {
      const type = doc.type || 'unknown';
      documentTypes[type] = (documentTypes[type] || 0) + 1;
    });

    // Recent uploads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUploads = documents.filter((doc: any) => {
      const createdAt = doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length;

    // Version statistics
    const versionsByDoc: Record<string, number> = {};
    let totalVersions = 0;
    versionsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const docId = data.documentId;
      if (documents.some((d: any) => d.id === docId)) {
        versionsByDoc[docId] = (versionsByDoc[docId] || 0) + 1;
        totalVersions++;
      }
    });

    const avgVersionsPerDoc = totalDocuments > 0 ? totalVersions / totalDocuments : 0;

    // Most versioned documents
    const mostVersioned = Object.entries(versionsByDoc)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([docId, count]) => {
        const doc: any = documents.find((d: any) => d.id === docId);
        return {
          id: docId,
          name: doc?.name || 'Unknown',
          versionCount: count,
        };
      });

    // Comments statistics
    const totalComments = commentsSnap.size;
    const commentsByDoc: Record<string, number> = {};
    commentsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const docId = data.documentId;
      commentsByDoc[docId] = (commentsByDoc[docId] || 0) + 1;
    });

    const mostCommented = Object.entries(commentsByDoc)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([docId, count]) => {
        const doc: any = documents.find((d: any) => d.id === docId);
        return {
          id: docId,
          name: doc?.name || 'Unknown',
          commentCount: count,
        };
      });

    // Recent comments (last 7 days)
    const recentComments = commentsSnap.docs.filter((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length;

    // Audit logs analysis
    const activityByType: Record<string, number> = {};
    const activityByUser: Record<string, number> = {};
    const recentActivity: any[] = [];

    auditLogsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const action = data.action || 'unknown';
      const userId = data.userId || 'unknown';

      activityByType[action] = (activityByType[action] || 0) + 1;
      activityByUser[userId] = (activityByUser[userId] || 0) + 1;

      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
      if (timestamp >= sevenDaysAgo) {
        recentActivity.push({
          action: data.action,
          userId: data.userId,
          userName: data.userName || 'Unknown',
          timestamp: timestamp.toISOString(),
          resourceType: data.resourceType,
          resourceId: data.resourceId,
        });
      }
    });

    // Sort recent activity by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Most active users
    const mostActiveUsers = Object.entries(activityByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => {
        const userDoc = usersSnap.docs.find(doc => doc.id === userId);
        const userData = userDoc?.data();
        return {
          userId,
          name: userData?.displayName || userData?.email || 'Unknown',
          actionCount: count,
        };
      });

    // Active users (users with activity in last 7 days)
    const activeUserIds = new Set(
      recentActivity.map(activity => activity.userId)
    );
    const activeUsersToday = activeUserIds.size;

    // Most viewed/downloaded documents
    const documentViews: Record<string, number> = {};
    const documentDownloads: Record<string, number> = {};

    auditLogsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.resourceType === 'document' && data.resourceId) {
        if (data.action === 'view' || data.action === 'preview') {
          documentViews[data.resourceId] = (documentViews[data.resourceId] || 0) + 1;
        } else if (data.action === 'download') {
          documentDownloads[data.resourceId] = (documentDownloads[data.resourceId] || 0) + 1;
        }
      }
    });

    const mostViewed = Object.entries(documentViews)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([docId, count]) => {
        const doc: any = documents.find((d: any) => d.id === docId);
        return {
          id: docId,
          name: doc?.name || 'Unknown',
          viewCount: count,
        };
      });

    const mostDownloaded = Object.entries(documentDownloads)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([docId, count]) => {
        const doc: any = documents.find((d: any) => d.id === docId);
        return {
          id: docId,
          name: doc?.name || 'Unknown',
          downloadCount: count,
        };
      });

    // Storage by file type
    const storageByType: Record<string, number> = {};
    documents.forEach((doc: any) => {
      const type = doc.type || 'unknown';
      storageByType[type] = (storageByType[type] || 0) + (doc.size || 0);
    });

    // Response
    res.json({
      overview: {
        totalDocuments,
        totalFolders: foldersSnap.size,
        totalStorage,
        totalUsers: usersSnap.size,
        totalVersions,
        totalComments,
        recentUploads,
        recentComments,
        activeUsersToday,
        avgVersionsPerDoc: Math.round(avgVersionsPerDoc * 10) / 10,
      },
      documentTypes,
      storageByType,
      activityByType,
      mostVersioned,
      mostCommented,
      mostViewed,
      mostDownloaded,
      mostActiveUsers,
      recentActivity: recentActivity.slice(0, 20),
    });
  } catch (error: any) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
