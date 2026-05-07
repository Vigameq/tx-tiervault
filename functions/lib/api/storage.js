"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const firebase_1 = require("../config/firebase");
const router = express_1.default.Router();
/**
 * Get storage usage for tenant
 */
router.get('/usage', auth_1.authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        // Get all documents for tenant
        const documentsSnap = await firebase_1.db
            .collection('documents')
            .where('tenantId', '==', tenantId)
            .get();
        let totalBytes = 0;
        let documentCount = 0;
        documentsSnap.docs.forEach((doc) => {
            const data = doc.data();
            totalBytes += data.size || 0;
            documentCount++;
        });
        res.json({
            totalBytes,
            documentCount,
            totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
            totalGB: (totalBytes / (1024 * 1024 * 1024)).toFixed(4),
        });
    }
    catch (error) {
        console.error('Storage usage error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=storage.js.map