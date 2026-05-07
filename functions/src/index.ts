import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';

// Import Firebase config (initializes admin)
import './config/firebase';

// Initialize Express app
const app = express();

// Don't use express-fileupload middleware - it doesn't work with Firebase Functions
// We'll handle multipart manually in the upload routes

// CORS middleware - allow specific origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tiervault-tx.web.app',
  'https://tiervault-tx.firebaseapp.com'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now during development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Don't use global body parser - it interferes with multipart uploads
// Apply express.json() per-route in routes that need it

// Import routes
import authRoutes from './api/auth';
import documentRoutes from './api/documents';
import folderRoutes from './api/folders';
import tenantRoutes from './api/tenants';
import userRoutes from './api/users';
import storageRoutes from './api/storage';
import analyticsRoutes from './api/analytics';

// Register routes
app.use('/auth', authRoutes);
app.use('/documents', documentRoutes);
app.use('/folders', folderRoutes);
app.use('/storage', storageRoutes);
app.use('/tenants', tenantRoutes);
app.use('/users', userRoutes);
app.use('/analytics', analyticsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export the API as a single Firebase Function with raw body parsing
export const api = functions.runWith({
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(app);

// Additional Firebase Functions for background tasks
// TODO: Fix circular dependency before uncommenting
// export { onDocumentCreated } from './services/documentService';
// export { onVersionCreated } from './services/versionService';
