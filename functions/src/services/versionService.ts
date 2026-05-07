import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';

/**
 * Firestore trigger: When a new version is created
 */
export const onVersionCreated = functions.firestore
  .document('documentVersions/{versionId}')
  .onCreate(async (snap, context) => {
    const version = snap.data();

    await db.collection('auditLogs').add({
      tenantId: version.documentId,
      userId: version.changedBy,
      action: 'version_created',
      resourceType: 'documentVersion',
      resourceId: context.params.versionId,
      metadata: {
        version: version.version,
        documentId: version.documentId,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
