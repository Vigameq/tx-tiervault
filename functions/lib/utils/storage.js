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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileMetadata = exports.fileExists = exports.calculateChecksum = exports.deleteFile = exports.getSignedUrl = exports.uploadFile = void 0;
const AWS = __importStar(require("aws-sdk"));
const crypto = __importStar(require("crypto"));
// Initialize Digital Ocean Spaces client (S3-compatible)
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT || '');
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
    region: process.env.DO_SPACES_REGION || 'nyc3',
});
const BUCKET_NAME = process.env.DO_SPACES_BUCKET || 'tiervault';
/**
 * Upload file to Digital Ocean Spaces
 */
const uploadFile = async (fileBuffer, fileName, tenantId, documentId, versionId) => {
    const fileKey = `${tenantId}/${documentId}/${versionId}/${fileName}`;
    const checksum = (0, exports.calculateChecksum)(fileBuffer);
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: fileBuffer,
        ACL: 'private',
        ContentType: getContentType(fileName),
        Metadata: {
            tenantId,
            documentId,
            versionId,
            checksum,
        },
    };
    await s3.upload(params).promise();
    const fileUrl = `https://${BUCKET_NAME}.${process.env.DO_SPACES_ENDPOINT}/${fileKey}`;
    return { fileKey, fileUrl, checksum };
};
exports.uploadFile = uploadFile;
/**
 * Get signed URL for file download
 */
const getSignedUrl = async (fileKey, expiresIn = 3600) => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Expires: expiresIn,
    };
    return s3.getSignedUrlPromise('getObject', params);
};
exports.getSignedUrl = getSignedUrl;
/**
 * Delete file from Spaces
 */
const deleteFile = async (fileKey) => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
    };
    await s3.deleteObject(params).promise();
};
exports.deleteFile = deleteFile;
/**
 * Calculate file checksum (SHA-256)
 */
const calculateChecksum = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};
exports.calculateChecksum = calculateChecksum;
/**
 * Get content type based on file extension
 */
const getContentType = (fileName) => {
    var _a;
    const ext = (_a = fileName.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    const mimeTypes = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        txt: 'text/plain',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        step: 'application/step',
        stp: 'application/step',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
};
/**
 * Check if file exists
 */
const fileExists = async (fileKey) => {
    try {
        await s3.headObject({ Bucket: BUCKET_NAME, Key: fileKey }).promise();
        return true;
    }
    catch (error) {
        return false;
    }
};
exports.fileExists = fileExists;
/**
 * Get file metadata
 */
const getFileMetadata = async (fileKey) => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
    };
    return s3.headObject(params).promise();
};
exports.getFileMetadata = getFileMetadata;
//# sourceMappingURL=storage.js.map