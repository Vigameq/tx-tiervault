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
 * Create new tenant (system admin only)
 */
router.post('/', auth_1.authenticate, async (req, res) => {
    var _a;
    try {
        // Only system admin can create tenants
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
            return res.status(403).json({ error: 'Only admin can create tenants' });
        }
        const { name, domain, storageLimit } = req.body;
        const tenantData = {
            name,
            domain,
            storageLimit: storageLimit || 10737418240, // 10GB default
            storageUsed: 0,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const tenantRef = await firebase_1.db.collection('tenants').add(tenantData);
        res.status(201).json({
            message: 'Tenant created successfully',
            tenantId: tenantRef.id,
        });
    }
    catch (error) {
        console.error('Tenant creation error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get tenant by ID
 */
router.get('/:tenantId', auth_1.authenticate, async (req, res) => {
    var _a, _b;
    try {
        const { tenantId } = req.params;
        // User can only access their own tenant
        if (tenantId !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const tenantDoc = await firebase_1.db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            return res.status(404).json({ error: 'Tenant not found' });
        }
        res.json(Object.assign({ id: tenantDoc.id }, tenantDoc.data()));
    }
    catch (error) {
        console.error('Get tenant error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=tenants.js.map