"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const firebase_1 = require("../config/firebase");
const authenticate = async (req, res, next) => {
    // Skip authentication for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
        return next();
    }
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await firebase_1.auth.verifyIdToken(token);
        // Get user data from Firestore
        const userDoc = await firebase_1.db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userData = userDoc.data();
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email || '',
            tenantId: (userData === null || userData === void 0 ? void 0 : userData.tenantId) || '',
            role: (userData === null || userData === void 0 ? void 0 : userData.role) || 'viewer',
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
exports.authenticate = authenticate;
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map