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
 * Get all users for tenant (admin only)
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const tenantId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId;
        // Only admin can list users
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
            return res.status(403).json({ error: 'Only admin can list users' });
        }
        const usersSnapshot = await firebase_1.db
            .collection('users')
            .where('tenantId', '==', tenantId)
            .get();
        const users = usersSnapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        res.json({ users, count: users.length });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get all suppliers for tenant (admin/manager only)
 * NOTE: This must come BEFORE /:userId route to avoid "suppliers" being treated as a userId
 */
router.get('/suppliers', auth_1.authenticate, async (req, res) => {
    var _a, _b, _c;
    try {
        const tenantId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId;
        // Only admin and manager can list suppliers
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin' && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== 'manager') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const usersSnapshot = await firebase_1.db
            .collection('users')
            .where('tenantId', '==', tenantId)
            .where('role', '==', 'supplier')
            .get();
        const suppliers = usersSnapshot.docs.map((doc) => ({
            id: doc.id,
            email: doc.data().email,
            displayName: doc.data().displayName,
            assignedFolders: doc.data().assignedFolders || [],
        }));
        res.json({ suppliers, count: suppliers.length });
    }
    catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get user by ID
 */
router.get('/:userId', auth_1.authenticate, async (req, res) => {
    var _a;
    try {
        const { userId } = req.params;
        const userDoc = await firebase_1.db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userData = userDoc.data();
        // Check tenant access
        if (userData.tenantId !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(Object.assign({ id: userDoc.id }, userData));
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Update user
 */
router.put('/:userId', auth_1.authenticate, async (req, res) => {
    var _a, _b, _c;
    try {
        const { userId } = req.params;
        const { displayName, role, isActive, assignedFolders } = req.body;
        // Only admin can update users
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
            return res.status(403).json({ error: 'Only admin can update users' });
        }
        const userDoc = await firebase_1.db.collection('users').doc(userId).get();
        if (!userDoc.exists || ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.tenantId) !== ((_c = req.user) === null || _c === void 0 ? void 0 : _c.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const updateData = {
            displayName,
            role,
            isActive,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Handle assignedFolders for suppliers
        if (role === 'supplier') {
            updateData.assignedFolders = assignedFolders || [];
        }
        else {
            // Remove assignedFolders if changing from supplier to other role
            updateData.assignedFolders = admin.firestore.FieldValue.delete();
        }
        await firebase_1.db.collection('users').doc(userId).update(updateData);
        res.json({ message: 'User updated successfully' });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Delete user
 */
router.delete('/:userId', auth_1.authenticate, async (req, res) => {
    var _a, _b, _c;
    try {
        const { userId } = req.params;
        // Only admin can delete users
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
            return res.status(403).json({ error: 'Only admin can delete users' });
        }
        const userDoc = await firebase_1.db.collection('users').doc(userId).get();
        if (!userDoc.exists || ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.tenantId) !== ((_c = req.user) === null || _c === void 0 ? void 0 : _c.tenantId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Delete from Firebase Auth
        await firebase_1.auth.deleteUser(userId);
        // Delete from Firestore
        await firebase_1.db.collection('users').doc(userId).delete();
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get current user's profile
 */
router.get('/me/profile', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const userDoc = await firebase_1.db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userData = userDoc.data();
        res.json({
            id: userDoc.id,
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            preferences: userData.preferences || {},
            notificationSettings: userData.notificationSettings || {
                emailOnUpload: true,
                emailOnComment: true,
                emailOnShare: true,
                activityDigest: 'weekly',
            },
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Update current user's profile
 */
router.patch('/me/profile', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { displayName, preferences, notificationSettings } = req.body;
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (displayName !== undefined) {
            updateData.displayName = displayName.trim();
        }
        if (preferences !== undefined) {
            updateData.preferences = preferences;
        }
        if (notificationSettings !== undefined) {
            updateData.notificationSettings = notificationSettings;
        }
        await firebase_1.db.collection('users').doc(userId).update(updateData);
        res.json({ message: 'Profile updated successfully' });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Change current user's password
 */
router.post('/me/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        // Update password in Firebase Auth
        await firebase_1.auth.updateUser(userId, {
            password: newPassword,
        });
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map