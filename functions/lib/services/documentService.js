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
Object.defineProperty(exports, "__esModule", { value: true });
exports.onDocumentCreated = exports.getDocumentVersions = exports.createDocumentVersion = exports.createDocument = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firebase_1 = require("../config/firebase");
const storage_1 = require("../utils/storage");
const versioning_1 = require("../utils/versioning");
/**
 * Create a new document with initial version
 */
const createDocument = async (tenantId, userId, fileName, fileBuffer, folderId = null, comment = 'Initial version') => {
    const documentRef = firebase_1.db.collection('documents').doc();
    const versionRef = firebase_1.db.collection('documentVersions').doc();
    const checksum = (0, storage_1.calculateChecksum)(fileBuffer);
    const fileSize = fileBuffer.length;
    const fileType = fileName.split('.').pop() || 'unknown';
    // Upload file to storage
    const uploadResult = await (0, storage_1.uploadFile)(fileBuffer, fileName, tenantId, documentRef.id, versionRef.id);
    // Create document
    const document = {
        tenantId,
        name: fileName,
        type: fileType,
        size: fileSize,
        folderId,
        currentVersion: '1.0.0',
        latestVersionId: versionRef.id,
        metadata: {
            tags: [],
            category: '',
            customFields: {},
        },
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
    // Create version
    const version = {
        documentId: documentRef.id,
        version: '1.0.0',
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileKey,
        size: fileSize,
        checksum,
        comment,
        changeType: 'created',
        changedBy: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Save to Firestore
    await documentRef.set(document);
    await versionRef.set(version);
    return {
        document: Object.assign({ id: documentRef.id }, document),
        version: Object.assign({ id: versionRef.id }, version),
    };
};
exports.createDocument = createDocument;
/**
 * Create new version of existing document
 */
const createDocumentVersion = async (documentId, userId, fileBuffer, comment = 'Updated version') => {
    const documentRef = firebase_1.db.collection('documents').doc(documentId);
    const documentSnap = await documentRef.get();
    if (!documentSnap.exists) {
        throw new Error('Document not found');
    }
    const document = documentSnap.data();
    const checksum = (0, storage_1.calculateChecksum)(fileBuffer);
    // Get latest version to compare
    const latestVersionSnap = await firebase_1.db
        .collection('documentVersions')
        .doc(document.latestVersionId)
        .get();
    if (!latestVersionSnap.exists) {
        throw new Error('Latest version not found');
    }
    const latestVersion = latestVersionSnap.data();
    // Compare checksums - only create new version if file has changed
    if (checksum === latestVersion.checksum) {
        throw new Error('No changes detected - file is identical to latest version');
    }
    // Create new version
    const versionRef = firebase_1.db.collection('documentVersions').doc();
    const nextVersion = (0, versioning_1.getNextVersion)(document.currentVersion, 'major');
    const uploadResult = await (0, storage_1.uploadFile)(fileBuffer, document.name, document.tenantId, documentId, versionRef.id);
    const version = {
        documentId,
        version: nextVersion,
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileKey,
        size: fileBuffer.length,
        checksum,
        comment,
        changeType: 'updated',
        changedBy: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Update document with new version info
    await documentRef.update({
        currentVersion: nextVersion,
        latestVersionId: versionRef.id,
        size: fileBuffer.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await versionRef.set(version);
    return Object.assign({ id: versionRef.id }, version);
};
exports.createDocumentVersion = createDocumentVersion;
/**
 * Get all versions of a document
 */
const getDocumentVersions = async (documentId) => {
    const versionsSnap = await firebase_1.db
        .collection('documentVersions')
        .where('documentId', '==', documentId)
        .orderBy('createdAt', 'desc')
        .get();
    return versionsSnap.docs.map((doc) => {
        var _a, _b, _c;
        const data = doc.data();
        return Object.assign(Object.assign({ id: doc.id }, data), { 
            // Convert Firestore Timestamp to ISO string
            createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || data.createdAt });
    });
};
exports.getDocumentVersions = getDocumentVersions;
/**
 * Firestore trigger: When a document is created, log audit entry
 */
exports.onDocumentCreated = functions.firestore
    .document('documents/{documentId}')
    .onCreate(async (snap, context) => {
    const document = snap.data();
    await firebase_1.db.collection('auditLogs').add({
        tenantId: document.tenantId,
        userId: document.createdBy,
        action: 'upload',
        resourceType: 'document',
        resourceId: context.params.documentId,
        metadata: {
            fileName: document.name,
            fileType: document.type,
            fileSize: document.size,
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
});
//# sourceMappingURL=documentService.js.map