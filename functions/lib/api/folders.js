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
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const firebase_1 = require("../config/firebase");
const router = express_1.default.Router();
// Apply JSON body parser for this router
router.use(express_1.default.json());
/**
 * Create new folder
 */
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        // Suppliers cannot create folders
        if (req.user.role === 'supplier') {
            return res.status(403).json({ error: 'Suppliers cannot create folders' });
        }
        const { name, parentId = null } = req.body;
        const tenantId = req.user.tenantId;
        const userId = req.user.uid;
        // Build folder path
        let path = name;
        if (parentId) {
            const parentSnap = await firebase_1.db.collection('folders').doc(parentId).get();
            if (!parentSnap.exists) {
                return res.status(404).json({ error: 'Parent folder not found' });
            }
            const parentData = parentSnap.data();
            path = `${parentData.path}/${name}`;
        }
        const folderData = {
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
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const folderRef = await firebase_1.db.collection('folders').add(folderData);
        res.status(201).json({
            message: 'Folder created successfully',
            folder: Object.assign({ id: folderRef.id }, folderData),
        });
    }
    catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get all folders for tenant
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { parentId, all } = req.query;
        const tenantId = req.user.tenantId;
        // For suppliers: only show assigned folders
        if (req.user.role === 'supplier') {
            const userDoc = await firebase_1.db.collection('users').doc(req.user.uid).get();
            const userData = userDoc.data();
            const assignedFolders = (userData === null || userData === void 0 ? void 0 : userData.assignedFolders) || [];
            if (assignedFolders.length === 0) {
                return res.json({ folders: [], count: 0 });
            }
            // If specific parentId requested, check access
            if (parentId && !assignedFolders.includes(parentId)) {
                return res.status(403).json({ error: 'Access denied to this folder' });
            }
            // Fetch only assigned folders
            const foldersSnap = await firebase_1.db.collection('folders')
                .where('tenantId', '==', tenantId)
                .where(admin.firestore.FieldPath.documentId(), 'in', assignedFolders)
                .get();
            const folders = foldersSnap.docs.map((doc) => {
                var _a, _b, _c, _d, _e, _f;
                const data = doc.data();
                return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt, updatedAt: ((_f = (_e = (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || data.updatedAt });
            });
            return res.json({ folders, count: folders.length });
        }
        // For non-suppliers: ownership-based access
        let query = firebase_1.db.collection('folders').where('tenantId', '==', tenantId);
        // Admin sees everything, others see only their own folders + shared folders
        if (req.user.role !== 'admin') {
            // Get folders shared with this user (from their assignedFolders)
            const userDoc = await firebase_1.db.collection('users').doc(req.user.uid).get();
            const userData = userDoc.data();
            const sharedFolderIds = (userData === null || userData === void 0 ? void 0 : userData.assignedFolders) || [];
            // Fetch owned folders and shared folders separately, then merge
            const ownedFoldersSnap = await firebase_1.db.collection('folders')
                .where('tenantId', '==', tenantId)
                .where('createdBy', '==', req.user.uid)
                .get();
            let allFolderDocs = [...ownedFoldersSnap.docs];
            // Fetch shared folders in batches (Firestore 'in' limit is 10)
            if (sharedFolderIds.length > 0) {
                for (let i = 0; i < sharedFolderIds.length; i += 10) {
                    const batch = sharedFolderIds.slice(i, i + 10);
                    const sharedSnap = await firebase_1.db.collection('folders')
                        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
                        .get();
                    allFolderDocs.push(...sharedSnap.docs);
                }
            }
            // Remove duplicates
            const uniqueFolderDocs = Array.from(new Map(allFolderDocs.map(doc => [doc.id, doc])).values());
            // Filter by parentId
            let filteredDocs = uniqueFolderDocs;
            if (parentId) {
                filteredDocs = filteredDocs.filter(doc => doc.data().parentId === parentId);
            }
            else {
                filteredDocs = filteredDocs.filter(doc => doc.data().parentId === null || doc.data().parentId === undefined);
            }
            // Sort by createdAt descending
            filteredDocs.sort((a, b) => {
                var _a, _b;
                const aTime = ((_a = a.data().createdAt) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0;
                const bTime = ((_b = b.data().createdAt) === null || _b === void 0 ? void 0 : _b.toMillis()) || 0;
                return bTime - aTime;
            });
            const snapshot = { docs: filteredDocs };
            const folderIds = snapshot.docs.map(doc => doc.id);
            // Get sharing information for all folders
            const sharingInfo = {};
            if (folderIds.length > 0) {
                // Find all users who have these folders in their assignedFolders
                const usersSnap = await firebase_1.db.collection('users')
                    .where('tenantId', '==', tenantId)
                    .where('role', '==', 'supplier')
                    .get();
                usersSnap.docs.forEach(userDoc => {
                    const userData = userDoc.data();
                    const assignedFolders = userData.assignedFolders || [];
                    assignedFolders.forEach((folderId) => {
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
                var _a, _b, _c, _d, _e, _f;
                const data = doc.data();
                return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt, updatedAt: ((_f = (_e = (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || data.updatedAt, sharedWith: sharingInfo[doc.id] || [] });
            });
            return res.json({ folders, count: folders.length });
        }
        else {
            // Admin path: see all folders
            if (parentId) {
                query = query.where('parentId', '==', parentId);
            }
            else {
                query = query.where('parentId', '==', null);
            }
            const snapshot = await query.orderBy('createdAt', 'desc').get();
            const folderIds = snapshot.docs.map(doc => doc.id);
            // Get sharing information for all folders
            const sharingInfo = {};
            if (folderIds.length > 0) {
                const usersSnap = await firebase_1.db.collection('users')
                    .where('tenantId', '==', tenantId)
                    .where('role', '==', 'supplier')
                    .get();
                usersSnap.docs.forEach(userDoc => {
                    const userData = userDoc.data();
                    const assignedFolders = userData.assignedFolders || [];
                    assignedFolders.forEach((folderId) => {
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
                var _a, _b, _c, _d, _e, _f;
                const data = doc.data();
                return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt, updatedAt: ((_f = (_e = (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || data.updatedAt, sharedWith: sharingInfo[doc.id] || [] });
            });
            return res.json({ folders, count: folders.length });
        }
        // For 'all' parameter, fetch all folders (admin sees all, others see owned+shared)
        if (req.user.role === 'admin') {
            const snapshot = await query.get();
            const folderIds = snapshot.docs.map(doc => doc.id);
            // Get sharing information for all folders
            const sharingInfo = {};
            if (folderIds.length > 0) {
                const usersSnap = await firebase_1.db.collection('users')
                    .where('tenantId', '==', tenantId)
                    .where('role', '==', 'supplier')
                    .get();
                usersSnap.docs.forEach(userDoc => {
                    const userData = userDoc.data();
                    const assignedFolders = userData.assignedFolders || [];
                    assignedFolders.forEach((folderId) => {
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
                var _a, _b, _c, _d, _e, _f;
                const data = doc.data();
                return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt, updatedAt: ((_f = (_e = (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || data.updatedAt, sharedWith: sharingInfo[doc.id] || [] });
            });
            return res.json({ folders, count: folders.length });
        }
        else {
            // Non-admin: fetch owned + shared folders (all=true, no parent filter)
            const userDoc = await firebase_1.db.collection('users').doc(req.user.uid).get();
            const userData = userDoc.data();
            const sharedFolderIds = (userData === null || userData === void 0 ? void 0 : userData.assignedFolders) || [];
            const ownedFoldersSnap = await firebase_1.db.collection('folders')
                .where('tenantId', '==', tenantId)
                .where('createdBy', '==', req.user.uid)
                .get();
            let allFolderDocs = [...ownedFoldersSnap.docs];
            if (sharedFolderIds.length > 0) {
                for (let i = 0; i < sharedFolderIds.length; i += 10) {
                    const batch = sharedFolderIds.slice(i, i + 10);
                    const sharedSnap = await firebase_1.db.collection('folders')
                        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
                        .get();
                    allFolderDocs.push(...sharedSnap.docs);
                }
            }
            const uniqueFolderDocs = Array.from(new Map(allFolderDocs.map(doc => [doc.id, doc])).values());
            const folderIds = uniqueFolderDocs.map(doc => doc.id);
            const sharingInfo = {};
            if (folderIds.length > 0) {
                const usersSnap = await firebase_1.db.collection('users')
                    .where('tenantId', '==', tenantId)
                    .where('role', '==', 'supplier')
                    .get();
                usersSnap.docs.forEach(userDoc => {
                    const userData = userDoc.data();
                    const assignedFolders = userData.assignedFolders || [];
                    assignedFolders.forEach((folderId) => {
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
            const folders = uniqueFolderDocs.map((doc) => {
                var _a, _b, _c, _d, _e, _f;
                const data = doc.data();
                return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt, updatedAt: ((_f = (_e = (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || data.updatedAt, sharedWith: sharingInfo[doc.id] || [] });
            });
            return res.json({ folders, count: folders.length });
        }
    }
    catch (error) {
        console.error('Get folders error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get folder by ID
 */
router.get('/:folderId', auth_1.authenticate, async (req, res) => {
    var _a;
    try {
        const { folderId } = req.params;
        const folderSnap = await firebase_1.db.collection('folders').doc(folderId).get();
        if (!folderSnap.exists) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        const folder = Object.assign({ id: folderSnap.id }, folderSnap.data());
        if (folder.tenantId !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(folder);
    }
    catch (error) {
        console.error('Get folder error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Rename folder
 */
router.patch('/:folderId/rename', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        // Suppliers cannot rename folders
        if (req.user.role === 'supplier') {
            return res.status(403).json({ error: 'Suppliers cannot rename folders' });
        }
        const { folderId } = req.params;
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const folderSnap = await firebase_1.db.collection('folders').doc(folderId).get();
        if (!folderSnap.exists || ((_a = folderSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await firebase_1.db.collection('folders').doc(folderId).update({
            name: name.trim(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ message: 'Folder renamed successfully' });
    }
    catch (error) {
        console.error('Rename folder error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Update folder
 */
router.put('/:folderId', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { folderId } = req.params;
        const { name } = req.body;
        const folderSnap = await firebase_1.db.collection('folders').doc(folderId).get();
        if (!folderSnap.exists || ((_a = folderSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await firebase_1.db.collection('folders').doc(folderId).update({
            name,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ message: 'Folder updated successfully' });
    }
    catch (error) {
        console.error('Update folder error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Delete folder
 */
router.delete('/:folderId', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        // Suppliers cannot delete folders
        if (req.user.role === 'supplier') {
            return res.status(403).json({ error: 'Suppliers cannot delete folders' });
        }
        const { folderId } = req.params;
        const folderSnap = await firebase_1.db.collection('folders').doc(folderId).get();
        if (!folderSnap.exists || ((_a = folderSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Check if folder has documents
        const documentsSnap = await firebase_1.db
            .collection('documents')
            .where('folderId', '==', folderId)
            .limit(1)
            .get();
        if (!documentsSnap.empty) {
            return res.status(400).json({ error: 'Cannot delete folder with documents' });
        }
        // Check if folder has subfolders
        const subfoldersSnap = await firebase_1.db
            .collection('folders')
            .where('parentId', '==', folderId)
            .limit(1)
            .get();
        if (!subfoldersSnap.empty) {
            return res.status(400).json({ error: 'Cannot delete folder with subfolders' });
        }
        await firebase_1.db.collection('folders').doc(folderId).delete();
        res.json({ message: 'Folder deleted successfully' });
    }
    catch (error) {
        console.error('Delete folder error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Share folder with suppliers (manager/admin only)
 */
router.post('/:folderId/share', auth_1.authenticate, async (req, res) => {
    var _a, _b, _c;
    try {
        // Only manager and admin can share folders
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only managers and admins can share folders' });
        }
        const { folderId } = req.params;
        const { userIds } = req.body; // Array of user IDs to share with
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'User IDs are required' });
        }
        // Verify folder exists and belongs to tenant
        const folderSnap = await firebase_1.db.collection('folders').doc(folderId).get();
        if (!folderSnap.exists || ((_a = folderSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Update each user's assignedFolders
        const batch = firebase_1.db.batch();
        const errors = [];
        for (const userId of userIds) {
            const userSnap = await firebase_1.db.collection('users').doc(userId).get();
            if (!userSnap.exists) {
                errors.push(`User ${userId} not found`);
                continue;
            }
            const userData = userSnap.data();
            // Verify user is in same tenant
            if ((userData === null || userData === void 0 ? void 0 : userData.tenantId) !== ((_c = req.user) === null || _c === void 0 ? void 0 : _c.tenantId)) {
                errors.push(`User ${userId} not in same tenant`);
                continue;
            }
            // Only share with suppliers
            if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'supplier') {
                errors.push(`User ${userId} is not a supplier`);
                continue;
            }
            // Add folder to assignedFolders if not already present
            const assignedFolders = userData.assignedFolders || [];
            if (!assignedFolders.includes(folderId)) {
                assignedFolders.push(folderId);
                batch.update(firebase_1.db.collection('users').doc(userId), {
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
    }
    catch (error) {
        console.error('Share folder error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Unshare folder from suppliers (manager/admin only)
 */
router.post('/:folderId/unshare', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        // Only manager and admin can unshare folders
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only managers and admins can unshare folders' });
        }
        const { folderId } = req.params;
        const { userIds } = req.body; // Array of user IDs to unshare from
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'User IDs are required' });
        }
        // Verify folder exists and belongs to tenant
        const folderSnap = await firebase_1.db.collection('folders').doc(folderId).get();
        if (!folderSnap.exists || ((_a = folderSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Update each user's assignedFolders
        const batch = firebase_1.db.batch();
        for (const userId of userIds) {
            const userSnap = await firebase_1.db.collection('users').doc(userId).get();
            if (userSnap.exists) {
                const userData = userSnap.data();
                const assignedFolders = ((userData === null || userData === void 0 ? void 0 : userData.assignedFolders) || []).filter((id) => id !== folderId);
                batch.update(firebase_1.db.collection('users').doc(userId), {
                    assignedFolders,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        await batch.commit();
        res.json({ message: 'Folder unshared successfully' });
    }
    catch (error) {
        console.error('Unshare folder error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get users who have access to a folder (manager/admin only)
 */
router.get('/:folderId/shared-with', auth_1.authenticate, async (req, res) => {
    var _a, _b, _c;
    try {
        // Only manager and admin can view sharing info
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { folderId } = req.params;
        // Verify folder exists and belongs to tenant
        const folderSnap = await firebase_1.db.collection('folders').doc(folderId).get();
        if (!folderSnap.exists || ((_a = folderSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Find all users who have this folder in their assignedFolders
        const usersSnap = await firebase_1.db
            .collection('users')
            .where('tenantId', '==', (_c = req.user) === null || _c === void 0 ? void 0 : _c.tenantId)
            .where('assignedFolders', 'array-contains', folderId)
            .get();
        const users = usersSnap.docs.map((doc) => ({
            id: doc.id,
            email: doc.data().email,
            displayName: doc.data().displayName,
            role: doc.data().role,
        }));
        res.json({ users, count: users.length });
    }
    catch (error) {
        console.error('Get shared users error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=folders.js.map