import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';
import { uploadFile, calculateChecksum } from '../utils/storage';
import { getNextVersion } from '../utils/versioning';
import { Document, DocumentVersion } from '../types';

/**
 * Create a new document with initial version
 */
export const createDocument = async (
  tenantId: string,
  userId: string,
  fileName: string,
  fileBuffer: Buffer,
  folderId: string | null = null,
  comment: string = 'Initial version'
): Promise<{ document: Document; version: DocumentVersion }> => {
  const documentRef = db.collection('documents').doc();
  const versionRef = db.collection('documentVersions').doc();

  const checksum = calculateChecksum(fileBuffer);
  const fileSize = fileBuffer.length;
  const fileType = fileName.split('.').pop() || 'unknown';

  // Upload file to storage
  const uploadResult = await uploadFile(
    fileBuffer,
    fileName,
    tenantId,
    documentRef.id,
    versionRef.id
  );

  // Create document
  const document: Omit<Document, 'id'> = {
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
    createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
  };

  // Create version
  const version: Omit<DocumentVersion, 'id'> = {
    documentId: documentRef.id,
    version: '1.0.0',
    fileUrl: uploadResult.fileUrl,
    fileKey: uploadResult.fileKey,
    size: fileSize,
    checksum,
    comment,
    changeType: 'created',
    changedBy: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
  };

  // Save to Firestore
  await documentRef.set(document);
  await versionRef.set(version);

  return {
    document: { id: documentRef.id, ...document } as Document,
    version: { id: versionRef.id, ...version } as DocumentVersion,
  };
};

/**
 * Create new version of existing document
 */
export const createDocumentVersion = async (
  documentId: string,
  userId: string,
  fileBuffer: Buffer,
  comment: string = 'Updated version'
): Promise<DocumentVersion> => {
  const documentRef = db.collection('documents').doc(documentId);
  const documentSnap = await documentRef.get();

  if (!documentSnap.exists) {
    throw new Error('Document not found');
  }

  const document = documentSnap.data() as Document;
  const checksum = calculateChecksum(fileBuffer);

  // Get latest version to compare
  const latestVersionSnap = await db
    .collection('documentVersions')
    .doc(document.latestVersionId)
    .get();

  if (!latestVersionSnap.exists) {
    throw new Error('Latest version not found');
  }

  const latestVersion = latestVersionSnap.data() as DocumentVersion;

  // Compare checksums - only create new version if file has changed
  if (checksum === latestVersion.checksum) {
    throw new Error('No changes detected - file is identical to latest version');
  }

  // Create new version
  const versionRef = db.collection('documentVersions').doc();
  const nextVersion = getNextVersion(document.currentVersion, 'major');

  const uploadResult = await uploadFile(
    fileBuffer,
    document.name,
    document.tenantId,
    documentId,
    versionRef.id
  );

  const version: Omit<DocumentVersion, 'id'> = {
    documentId,
    version: nextVersion,
    fileUrl: uploadResult.fileUrl,
    fileKey: uploadResult.fileKey,
    size: fileBuffer.length,
    checksum,
    comment,
    changeType: 'updated',
    changedBy: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
  };

  // Update document with new version info
  await documentRef.update({
    currentVersion: nextVersion,
    latestVersionId: versionRef.id,
    size: fileBuffer.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await versionRef.set(version);

  return { id: versionRef.id, ...version } as DocumentVersion;
};

/**
 * Get all versions of a document
 */
export const getDocumentVersions = async (documentId: string): Promise<DocumentVersion[]> => {
  const versionsSnap = await db
    .collection('documentVersions')
    .where('documentId', '==', documentId)
    .orderBy('createdAt', 'desc')
    .get();

  return versionsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Convert Firestore Timestamp to ISO string
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    };
  }) as DocumentVersion[];
};

/**
 * Firestore trigger: When a document is created, log audit entry
 */
export const onDocumentCreated = functions.firestore
  .document('documents/{documentId}')
  .onCreate(async (snap, context) => {
    const document = snap.data() as Document;

    await db.collection('auditLogs').add({
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
