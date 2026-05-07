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
const firebase_1 = require("../config/firebase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply JSON body parser for this router
router.use(express_1.default.json());
/**
 * Register new user (tenant admin creates users)
 */
router.post('/register', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { email, password, displayName, role = 'viewer', assignedFolders = [] } = req.body;
        const tenantId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId;
        // Only admin can create users
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
            return res.status(403).json({ error: 'Only admin can create users' });
        }
        // Create Firebase user
        const userRecord = await firebase_1.auth.createUser({
            email,
            password,
            displayName,
        });
        // Create user document in Firestore
        const userData = {
            tenantId,
            role,
            displayName: displayName || email.split('@')[0],
            email,
            isActive: true,
            lastLoginAt: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Add assignedFolders for suppliers
        if (role === 'supplier' && assignedFolders.length > 0) {
            userData.assignedFolders = assignedFolders;
        }
        await firebase_1.db.collection('users').doc(userRecord.uid).set(userData);
        res.status(201).json({
            message: 'User created successfully',
            userId: userRecord.uid,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get current user profile
 */
router.get('/profile', auth_1.authenticate, async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
        const userDoc = await firebase_1.db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(Object.assign({ id: userDoc.id }, userDoc.data()));
    }
    catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Update user profile
 */
router.put('/profile', auth_1.authenticate, async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
        const { displayName } = req.body;
        await firebase_1.db.collection('users').doc(userId).update({
            displayName,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ message: 'Profile updated successfully' });
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Update last login timestamp
 */
router.post('/login', auth_1.authenticate, async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
        await firebase_1.db.collection('users').doc(userId).update({
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ message: 'Login recorded' });
    }
    catch (error) {
        console.error('Login record error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map