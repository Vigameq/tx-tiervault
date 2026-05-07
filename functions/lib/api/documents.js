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
const busboy_1 = __importDefault(require("busboy"));
const auth_1 = require("../middleware/auth");
const documentService_1 = require("../services/documentService");
const storage_1 = require("../utils/storage");
const firebase_1 = require("../config/firebase");
const router = express_1.default.Router();
/**
 * Upload new document
 * Handle multipart manually without middleware to work with Firebase Functions
 */
router.post('/upload', auth_1.authenticate, (req, res) => {
    const busboy = (0, busboy_1.default)({
        headers: req.headers,
        limits: {
            fileSize: 50 * 1024 * 1024, // 50MB
            files: 1
        }
    });
    let fileBuffer = null;
    let fileName = '';
    let folderId = null;
    let comment = 'Initial version';
    let fileProcessed = false;
    busboy.on('file', (fieldname, file, info) => {
        console.log('Busboy file event:', fieldname, info.filename);
        fileName = info.filename;
        const chunks = [];
        file.on('data', (chunk) => {
            chunks.push(chunk);
        });
        file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
            fileProcessed = true;
            console.log('File buffered:', fileBuffer.length, 'bytes');
        });
        file.on('error', (err) => {
            console.error('File stream error:', err);
        });
    });
    busboy.on('field', (fieldname, value) => {
        console.log('Busboy field:', fieldname, value);
        if (fieldname === 'folderId')
            folderId = value;
        if (fieldname === 'comment')
            comment = value;
    });
    busboy.on('error', (error) => {
        console.error('Busboy error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'File upload parsing error: ' + error.message });
        }
    });
    busboy.on('finish', async () => {
        console.log('Busboy finish event');
        try {
            if (!fileBuffer || !fileName) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            // Check if a document with the same name already exists in the same folder
            let existingDocQuery = firebase_1.db
                .collection('documents')
                .where('tenantId', '==', req.user.tenantId)
                .where('name', '==', fileName);
            // Filter by folder location
            if (folderId) {
                existingDocQuery = existingDocQuery.where('folderId', '==', folderId);
            }
            else {
                existingDocQuery = existingDocQuery.where('folderId', '==', null);
            }
            const existingDocs = await existingDocQuery.limit(1).get();
            // If document exists, create a new version instead of a new document
            if (!existingDocs.empty) {
                const existingDoc = existingDocs.docs[0];
                console.log('Found existing document:', existingDoc.id, '- creating new version');
                try {
                    const version = await (0, documentService_1.createDocumentVersion)(existingDoc.id, req.user.uid, fileBuffer, comment);
                    return res.status(201).json({
                        message: 'New version created successfully',
                        document: Object.assign({ id: existingDoc.id }, existingDoc.data()),
                        version,
                    });
                }
                catch (versionError) {
                    // If no changes detected, return success with informational message
                    if (versionError.message && versionError.message.includes('No changes detected')) {
                        return res.status(200).json({
                            message: 'No changes detected - file is identical to latest version',
                            document: Object.assign({ id: existingDoc.id }, existingDoc.data()),
                            noChanges: true,
                        });
                    }
                    throw versionError;
                }
            }
            // No existing document - create new one
            const result = await (0, documentService_1.createDocument)(req.user.tenantId, req.user.uid, fileName, fileBuffer, folderId, comment);
            res.status(201).json({
                message: 'Document uploaded successfully',
                document: result.document,
                version: result.version,
            });
        }
        catch (error) {
            console.error('Document creation error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    });
    // Pipe the raw request to busboy
    const rawBody = req.rawBody;
    rawBody ? busboy.end(rawBody) : req.pipe(busboy);
});
/**
 * Upload new version of existing document
 */
router.post('/:documentId/versions', auth_1.authenticate, (req, res) => {
    const { documentId } = req.params;
    const busboy = (0, busboy_1.default)({
        headers: req.headers,
        limits: {
            fileSize: 50 * 1024 * 1024,
            files: 1
        }
    });
    let fileBuffer = null;
    let comment = 'Updated version';
    busboy.on('file', (fieldname, file, info) => {
        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
        });
    });
    busboy.on('field', (fieldname, value) => {
        if (fieldname === 'comment')
            comment = value;
    });
    busboy.on('error', (error) => {
        console.error('Busboy error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'File upload parsing error: ' + error.message });
        }
    });
    busboy.on('finish', async () => {
        try {
            if (!fileBuffer) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            const version = await (0, documentService_1.createDocumentVersion)(documentId, req.user.uid, fileBuffer, comment);
            res.status(201).json({
                message: 'New version created successfully',
                version,
            });
        }
        catch (error) {
            console.error('Version upload error:', error);
            if (error.message && error.message.includes('No changes detected')) {
                return res.status(409).json({ error: error.message });
            }
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    });
    const rawBody = req.rawBody;
    rawBody ? busboy.end(rawBody) : req.pipe(busboy);
});
/**
 * Get document by ID
 */
router.get('/:documentId', auth_1.authenticate, async (req, res) => {
    var _a;
    try {
        const { documentId } = req.params;
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const document = Object.assign({ id: docSnap.id }, docSnap.data());
        // Check tenant access
        if (document.tenantId !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(document);
    }
    catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get all documents for tenant
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { folderId } = req.query;
        let query = firebase_1.db
            .collection('documents')
            .where('tenantId', '==', req.user.tenantId);
        // Filter by folder - if folderId is provided, show only documents in that folder
        // If no folderId, show only root-level documents (where folderId is null)
        if (folderId) {
            query = query.where('folderId', '==', folderId);
        }
        else {
            query = query.where('folderId', '==', null);
        }
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        // Fetch version counts for all documents
        const documents = await Promise.all(snapshot.docs.map(async (doc) => {
            var _a, _b, _c, _d, _e, _f;
            const data = doc.data();
            // Get version count for this document
            const versionsSnap = await firebase_1.db
                .collection('documentVersions')
                .where('documentId', '==', doc.id)
                .get();
            return Object.assign(Object.assign({ id: doc.id }, data), { versionCount: versionsSnap.size, 
                // Convert Firestore Timestamps to ISO strings for frontend
                createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt, updatedAt: ((_f = (_e = (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || data.updatedAt });
        }));
        res.json({ documents, count: documents.length });
    }
    catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get document versions
 */
router.get('/:documentId/versions', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { documentId } = req.params;
        // Verify access
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists || ((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const versions = await (0, documentService_1.getDocumentVersions)(documentId);
        res.json({ versions, count: versions.length });
    }
    catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Download document (get signed URL)
 */
router.get('/:documentId/download', auth_1.authenticate, async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        const { documentId } = req.params;
        const { versionId } = req.query;
        console.log('Download request for document:', documentId, 'versionId:', versionId);
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists) {
            console.error('Document not found:', documentId);
            return res.status(404).json({ error: 'Document not found' });
        }
        if (((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            console.error('Access denied - tenant mismatch');
            return res.status(403).json({ error: 'Access denied' });
        }
        let fileKey;
        if (versionId) {
            const versionSnap = await firebase_1.db.collection('documentVersions').doc(versionId).get();
            if (!versionSnap.exists) {
                console.error('Version not found:', versionId);
                return res.status(404).json({ error: 'Version not found' });
            }
            fileKey = (_c = versionSnap.data()) === null || _c === void 0 ? void 0 : _c.fileKey;
        }
        else {
            const latestVersionId = (_d = docSnap.data()) === null || _d === void 0 ? void 0 : _d.latestVersionId;
            console.log('Latest version ID:', latestVersionId);
            if (!latestVersionId) {
                console.error('No latest version ID found for document:', documentId);
                return res.status(500).json({ error: 'No version found for document' });
            }
            const versionSnap = await firebase_1.db.collection('documentVersions').doc(latestVersionId).get();
            if (!versionSnap.exists) {
                console.error('Latest version document not found:', latestVersionId);
                return res.status(500).json({ error: 'Version data not found' });
            }
            fileKey = (_e = versionSnap.data()) === null || _e === void 0 ? void 0 : _e.fileKey;
        }
        if (!fileKey) {
            console.error('No fileKey found in version data');
            return res.status(500).json({ error: 'File key not found' });
        }
        console.log('Generating signed URL for fileKey:', fileKey);
        const signedUrl = await (0, storage_1.getSignedUrl)(fileKey);
        console.log('Signed URL generated successfully');
        // Log download audit - only include versionId if it exists
        const auditData = {
            tenantId: req.user.tenantId,
            userId: req.user.uid,
            action: 'download',
            resourceType: 'document',
            resourceId: documentId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Only add metadata if versionId is provided
        if (versionId) {
            auditData.metadata = { versionId };
        }
        await firebase_1.db.collection('auditLogs').add(auditData);
        res.json({ downloadUrl: signedUrl });
    }
    catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate download URL' });
    }
});
/**
 * Rename document
 */
router.patch('/:documentId/rename', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { documentId } = req.params;
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists || ((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await firebase_1.db.collection('documents').doc(documentId).update({
            name: name.trim(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ message: 'Document renamed successfully' });
    }
    catch (error) {
        console.error('Rename document error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Move document to folder
 */
router.patch('/:documentId/move', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { documentId } = req.params;
        const { folderId } = req.body;
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists || ((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await firebase_1.db.collection('documents').doc(documentId).update({
            folderId: folderId || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ message: 'Document moved successfully' });
    }
    catch (error) {
        console.error('Move document error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get activity log for document
 */
router.get('/:documentId/activity', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { documentId } = req.params;
        // Verify document access
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists || ((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Get audit logs for this document
        const logsSnap = await firebase_1.db
            .collection('auditLogs')
            .where('resourceType', '==', 'document')
            .where('resourceId', '==', documentId)
            .get();
        const activities = logsSnap.docs
            .map((doc) => {
            var _a, _b, _c;
            const data = doc.data();
            return {
                id: doc.id,
                action: data.action,
                userId: data.userId,
                userName: data.userName || 'Unknown User',
                timestamp: ((_c = (_b = (_a = data.timestamp) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.timestamp,
                metadata: data.metadata,
            };
        })
            .sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateB - dateA; // descending order
        })
            .slice(0, 50); // limit to 50 most recent
        res.json({ activities, count: activities.length });
    }
    catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Log document view
 */
router.post('/:documentId/log-view', auth_1.authenticate, async (req, res) => {
    try {
        const { documentId } = req.params;
        // Verify document exists
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Document not found' });
        }
        // Log view
        await firebase_1.db.collection('auditLogs').add({
            tenantId: req.user.tenantId,
            userId: req.user.uid,
            userName: req.user.email,
            action: 'view',
            resourceType: 'document',
            resourceId: documentId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ message: 'View logged' });
    }
    catch (error) {
        console.error('Log view error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Delete a specific version of a document
 */
router.delete('/:documentId/versions/:versionId', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { documentId, versionId } = req.params;
        // Verify document access
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists || ((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Check how many versions exist
        const versionsSnap = await firebase_1.db
            .collection('documentVersions')
            .where('documentId', '==', documentId)
            .get();
        if (versionsSnap.size <= 1) {
            return res.status(400).json({ error: 'Cannot delete the only version. Delete the document instead.' });
        }
        // Verify version exists
        const versionSnap = await firebase_1.db.collection('documentVersions').doc(versionId).get();
        if (!versionSnap.exists) {
            return res.status(404).json({ error: 'Version not found' });
        }
        const document = docSnap.data();
        const isLatestVersion = (document === null || document === void 0 ? void 0 : document.latestVersionId) === versionId;
        // Delete the version
        await firebase_1.db.collection('documentVersions').doc(versionId).delete();
        // If deleted version was the latest, update document to point to the new latest
        if (isLatestVersion) {
            const remainingVersionsSnap = await firebase_1.db
                .collection('documentVersions')
                .where('documentId', '==', documentId)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            if (!remainingVersionsSnap.empty) {
                const newLatestVersion = remainingVersionsSnap.docs[0];
                const newLatestData = newLatestVersion.data();
                await firebase_1.db.collection('documents').doc(documentId).update({
                    latestVersionId: newLatestVersion.id,
                    currentVersion: newLatestData.version,
                    size: newLatestData.size,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        res.json({ message: 'Version deleted successfully' });
    }
    catch (error) {
        console.error('Delete version error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get comments for a document
 */
router.get('/:documentId/comments', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { documentId } = req.params;
        // Verify document access
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists || ((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const commentsSnap = await firebase_1.db
            .collection('comments')
            .where('documentId', '==', documentId)
            .get();
        const comments = commentsSnap.docs
            .map((doc) => {
            var _a, _b, _c;
            const data = doc.data();
            return {
                id: doc.id,
                text: data.text,
                userId: data.userId,
                userName: data.userName,
                createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt,
            };
        })
            .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA; // descending order
        });
        res.json({ comments, count: comments.length });
    }
    catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Add a comment to a document
 */
router.post('/:documentId/comments', auth_1.authenticate, async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        const { documentId } = req.params;
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Comment text is required' });
        }
        // Verify document access
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists || ((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const commentData = {
            documentId,
            tenantId: req.user.tenantId,
            userId: req.user.uid,
            userName: req.user.email,
            text: text.trim(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const commentRef = await firebase_1.db.collection('comments').add(commentData);
        const newComment = await commentRef.get();
        const data = newComment.data();
        res.status(201).json({
            id: commentRef.id,
            text: data === null || data === void 0 ? void 0 : data.text,
            userId: data === null || data === void 0 ? void 0 : data.userId,
            userName: data === null || data === void 0 ? void 0 : data.userName,
            createdAt: ((_e = (_d = (_c = data === null || data === void 0 ? void 0 : data.createdAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) === null || _e === void 0 ? void 0 : _e.toISOString()) || new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Delete a comment
 */
router.delete('/:documentId/comments/:commentId', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { documentId, commentId } = req.params;
        // Verify document access
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists || ((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Verify comment exists and belongs to user or user is admin
        const commentSnap = await firebase_1.db.collection('comments').doc(commentId).get();
        if (!commentSnap.exists) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        const comment = commentSnap.data();
        if ((comment === null || comment === void 0 ? void 0 : comment.userId) !== req.user.uid && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Can only delete your own comments' });
        }
        await firebase_1.db.collection('comments').doc(commentId).delete();
        res.json({ message: 'Comment deleted successfully' });
    }
    catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Delete document
 */
router.delete('/:documentId', auth_1.authenticate, async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { documentId } = req.params;
        const docSnap = await firebase_1.db.collection('documents').doc(documentId).get();
        if (!docSnap.exists || ((_a = docSnap.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Only owner or admin can delete
        const permissions = ((_c = docSnap.data()) === null || _c === void 0 ? void 0 : _c.permissions) || [];
        const userPermission = permissions.find((p) => { var _a; return p.userId === ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid); });
        if ((userPermission === null || userPermission === void 0 ? void 0 : userPermission.role) !== 'owner' && ((_d = req.user) === null || _d === void 0 ? void 0 : _d.role) !== 'admin') {
            return res.status(403).json({ error: 'Only document owner or admin can delete' });
        }
        // Soft delete - move to deleted collection
        await firebase_1.db.collection('deletedDocuments').doc(documentId).set(Object.assign(Object.assign({}, docSnap.data()), { deletedBy: req.user.uid, deletedAt: admin.firestore.FieldValue.serverTimestamp() }));
        await firebase_1.db.collection('documents').doc(documentId).delete();
        res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=documents.js.map