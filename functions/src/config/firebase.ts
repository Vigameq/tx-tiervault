import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export Firestore and Auth for use in other files
export const db = admin.firestore();
export const auth = admin.auth();
