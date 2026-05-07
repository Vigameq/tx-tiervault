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
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Import Firebase config (initializes admin)
require("./config/firebase");
// Initialize Express app
const app = (0, express_1.default)();
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
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(null, true); // Allow all for now during development
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use((0, cors_1.default)(corsOptions));
// Handle preflight requests
app.options('*', (0, cors_1.default)(corsOptions));
// Don't use global body parser - it interferes with multipart uploads
// Apply express.json() per-route in routes that need it
// Import routes
const auth_1 = __importDefault(require("./api/auth"));
const documents_1 = __importDefault(require("./api/documents"));
const folders_1 = __importDefault(require("./api/folders"));
const tenants_1 = __importDefault(require("./api/tenants"));
const users_1 = __importDefault(require("./api/users"));
const storage_1 = __importDefault(require("./api/storage"));
const analytics_1 = __importDefault(require("./api/analytics"));
// Register routes
app.use('/auth', auth_1.default);
app.use('/documents', documents_1.default);
app.use('/folders', folders_1.default);
app.use('/storage', storage_1.default);
app.use('/tenants', tenants_1.default);
app.use('/users', users_1.default);
app.use('/analytics', analytics_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Export the API as a single Firebase Function with raw body parsing
exports.api = functions.runWith({
    timeoutSeconds: 300,
    memory: '1GB'
}).https.onRequest(app);
// Additional Firebase Functions for background tasks
// TODO: Fix circular dependency before uncommenting
// export { onDocumentCreated } from './services/documentService';
// export { onVersionCreated } from './services/versionService';
//# sourceMappingURL=index.js.map