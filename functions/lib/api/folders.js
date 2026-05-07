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
        let query = firebase_1.db.collection('folders').where('tenantId', '==', tenantId);
        // If 'all' parameter is set, return all folders regardless of parent
        // Otherwise, filter by parentId
        if (!all) {
            if (parentId) {
                query = query.where('parentId', '==', parentId);
            }
            else {
                query = query.where('parentId', '==', null);
            }
            const snapshot = await query.orderBy('createdAt', 'desc').get();
            const folders = snapshot.docs.map((doc) => {
                var _a, _b, _c, _d, _e, _f;
                const data = doc.data();
                return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt, updatedAt: ((_f = (_e = (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || data.updatedAt });
            });
            return res.json({ folders, count: folders.length });
        }
        // For 'all', skip orderBy to avoid needing extra index
        const snapshot = await query.get();
        const folders = snapshot.docs.map((doc) => {
            var _a, _b, _c, _d, _e, _f;
            const data = doc.data();
            return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt, updatedAt: ((_f = (_e = (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || data.updatedAt });
        });
        res.json({ folders, count: folders.length });
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
exports.default = router;
//# sourceMappingURL=folders.js.map