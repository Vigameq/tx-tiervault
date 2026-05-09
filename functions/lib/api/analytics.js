"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../middleware/auth");
const firebase_1 = require("../config/firebase");
const router = express_1.default.Router();
/**
 * Get dashboard analytics for tenant
 */
router.get('/dashboard', auth_1.authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.uid;
        const userRole = req.user.role;
        // Admin sees everything, others see only their own data + shared data
        let documentsSnap;
        let foldersSnap;
        if (userRole === 'admin') {
            // Admin sees all documents and folders
            [documentsSnap, foldersSnap] = await Promise.all([
                firebase_1.db.collection('documents').where('tenantId', '==', tenantId).get(),
                firebase_1.db.collection('folders').where('tenantId', '==', tenantId).get(),
            ]);
        }
        else {
            // Non-admin: fetch owned documents + documents in shared folders
            const userDoc = await firebase_1.db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            const sharedFolderIds = (userData === null || userData === void 0 ? void 0 : userData.assignedFolders) || [];
            // Get owned folders
            const ownedFoldersSnap = await firebase_1.db.collection('folders')
                .where('tenantId', '==', tenantId)
                .where('createdBy', '==', userId)
                .get();
            let allFolderDocs = [...ownedFoldersSnap.docs];
            // Fetch shared folders in batches
            if (sharedFolderIds.length > 0) {
                for (let i = 0; i < sharedFolderIds.length; i += 10) {
                    const batch = sharedFolderIds.slice(i, i + 10);
                    const sharedSnap = await firebase_1.db.collection('folders')
                        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
                        .get();
                    allFolderDocs.push(...sharedSnap.docs);
                }
            }
            foldersSnap = { docs: allFolderDocs };
            // Get owned documents
            const ownedDocsSnap = await firebase_1.db.collection('documents')
                .where('tenantId', '==', tenantId)
                .where('createdBy', '==', userId)
                .get();
            // Get documents in accessible folders (owned + shared)
            const accessibleFolderIds = allFolderDocs.map(doc => doc.id);
            let docsInFolders = [];
            if (accessibleFolderIds.length > 0) {
                for (let i = 0; i < accessibleFolderIds.length; i += 10) {
                    const batch = accessibleFolderIds.slice(i, i + 10);
                    const folderDocsSnap = await firebase_1.db.collection('documents')
                        .where('tenantId', '==', tenantId)
                        .where('folderId', 'in', batch)
                        .get();
                    docsInFolders.push(...folderDocsSnap.docs);
                }
            }
            // Combine and deduplicate documents
            const allDocDocs = [...ownedDocsSnap.docs, ...docsInFolders];
            const uniqueDocDocs = Array.from(new Map(allDocDocs.map(doc => [doc.id, doc])).values());
            documentsSnap = { docs: uniqueDocDocs };
        }
        // Continue with other queries
        const [versionsSnap, commentsSnap, auditLogsSnap, usersSnap] = await Promise.all([
            firebase_1.db.collection('documentVersions').get(),
            firebase_1.db.collection('comments').where('tenantId', '==', tenantId).get(),
            firebase_1.db.collection('auditLogs').where('tenantId', '==', tenantId).get(),
            firebase_1.db.collection('users').where('tenantId', '==', tenantId).get(),
        ]);
        // Calculate document statistics
        const documents = documentsSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const totalDocuments = documents.length;
        // Storage calculation
        let totalStorage = 0;
        documents.forEach((doc) => {
            totalStorage += doc.size || 0;
        });
        // Document types breakdown
        const documentTypes = {};
        documents.forEach((doc) => {
            const type = doc.type || 'unknown';
            documentTypes[type] = (documentTypes[type] || 0) + 1;
        });
        // Recent uploads (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentUploads = documents.filter((doc) => {
            var _a;
            const createdAt = ((_a = doc.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) ? doc.createdAt.toDate() : new Date(doc.createdAt);
            return createdAt >= sevenDaysAgo;
        }).length;
        // Version statistics
        const versionsByDoc = {};
        let totalVersions = 0;
        versionsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const docId = data.documentId;
            if (documents.some((d) => d.id === docId)) {
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
            const doc = documents.find((d) => d.id === docId);
            return {
                id: docId,
                name: (doc === null || doc === void 0 ? void 0 : doc.name) || 'Unknown',
                versionCount: count,
            };
        });
        // Comments statistics - only for accessible documents
        const accessibleDocIds = new Set(documents.map((d) => d.id));
        const accessibleComments = commentsSnap.docs.filter((doc) => {
            const data = doc.data();
            return accessibleDocIds.has(data.documentId);
        });
        const totalComments = accessibleComments.length;
        const commentsByDoc = {};
        accessibleComments.forEach((doc) => {
            const data = doc.data();
            const docId = data.documentId;
            commentsByDoc[docId] = (commentsByDoc[docId] || 0) + 1;
        });
        const mostCommented = Object.entries(commentsByDoc)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([docId, count]) => {
            const doc = documents.find((d) => d.id === docId);
            return {
                id: docId,
                name: (doc === null || doc === void 0 ? void 0 : doc.name) || 'Unknown',
                commentCount: count,
            };
        });
        // Recent comments (last 7 days) - only accessible
        const recentComments = accessibleComments.filter((doc) => {
            var _a;
            const data = doc.data();
            const createdAt = ((_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) ? data.createdAt.toDate() : new Date(data.createdAt);
            return createdAt >= sevenDaysAgo;
        }).length;
        // Audit logs analysis - only for accessible resources
        const accessibleFolderIds = new Set(foldersSnap.docs.map((doc) => doc.id));
        const activityByType = {};
        const activityByUser = {};
        const recentActivity = [];
        auditLogsSnap.docs.forEach((doc) => {
            var _a;
            const data = doc.data();
            // Filter: only include logs for accessible documents/folders or user's own actions
            const isAccessibleResource = (data.resourceType === 'document' && accessibleDocIds.has(data.resourceId)) ||
                (data.resourceType === 'folder' && accessibleFolderIds.has(data.resourceId)) ||
                (!data.resourceType) || // General tenant actions
                (data.userId === userId); // User's own actions
            if (!isAccessibleResource) {
                return; // Skip this log entry
            }
            const action = data.action || 'unknown';
            const logUserId = data.userId || 'unknown';
            activityByType[action] = (activityByType[action] || 0) + 1;
            activityByUser[logUserId] = (activityByUser[logUserId] || 0) + 1;
            const timestamp = ((_a = data.timestamp) === null || _a === void 0 ? void 0 : _a.toDate) ? data.timestamp.toDate() : new Date(data.timestamp);
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
            const userData = userDoc === null || userDoc === void 0 ? void 0 : userDoc.data();
            return {
                userId,
                name: (userData === null || userData === void 0 ? void 0 : userData.displayName) || (userData === null || userData === void 0 ? void 0 : userData.email) || 'Unknown',
                actionCount: count,
            };
        });
        // Active users (users with activity in last 7 days)
        const activeUserIds = new Set(recentActivity.map(activity => activity.userId));
        const activeUsersToday = activeUserIds.size;
        // Most viewed/downloaded documents - only accessible ones
        const documentViews = {};
        const documentDownloads = {};
        auditLogsSnap.docs.forEach((doc) => {
            const data = doc.data();
            if (data.resourceType === 'document' && data.resourceId && accessibleDocIds.has(data.resourceId)) {
                if (data.action === 'view' || data.action === 'preview') {
                    documentViews[data.resourceId] = (documentViews[data.resourceId] || 0) + 1;
                }
                else if (data.action === 'download') {
                    documentDownloads[data.resourceId] = (documentDownloads[data.resourceId] || 0) + 1;
                }
            }
        });
        const mostViewed = Object.entries(documentViews)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([docId, count]) => {
            const doc = documents.find((d) => d.id === docId);
            return {
                id: docId,
                name: (doc === null || doc === void 0 ? void 0 : doc.name) || 'Unknown',
                viewCount: count,
            };
        });
        const mostDownloaded = Object.entries(documentDownloads)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([docId, count]) => {
            const doc = documents.find((d) => d.id === docId);
            return {
                id: docId,
                name: (doc === null || doc === void 0 ? void 0 : doc.name) || 'Unknown',
                downloadCount: count,
            };
        });
        // Storage by file type
        const storageByType = {};
        documents.forEach((doc) => {
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
    }
    catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map