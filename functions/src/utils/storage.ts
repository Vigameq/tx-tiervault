import * as AWS from 'aws-sdk';
import * as crypto from 'crypto';

// Initialize Digital Ocean Spaces client (S3-compatible)
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT || '');
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: process.env.DO_SPACES_REGION || 'nyc3',
});

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || 'tiervault';

export interface UploadResult {
  fileKey: string;
  fileUrl: string;
  checksum: string;
}

/**
 * Upload file to Digital Ocean Spaces
 */
export const uploadFile = async (
  fileBuffer: Buffer,
  fileName: string,
  tenantId: string,
  documentId: string,
  versionId: string
): Promise<UploadResult> => {
  const fileKey = `${tenantId}/${documentId}/${versionId}/${fileName}`;
  const checksum = calculateChecksum(fileBuffer);

  const params: AWS.S3.PutObjectRequest = {
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

/**
 * Get signed URL for file download
 */
export const getSignedUrl = async (
  fileKey: string,
  expiresIn: number = 3600
): Promise<string> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Expires: expiresIn,
  };

  return s3.getSignedUrlPromise('getObject', params);
};

/**
 * Delete file from Spaces
 */
export const deleteFile = async (fileKey: string): Promise<void> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
  };

  await s3.deleteObject(params).promise();
};

/**
 * Calculate file checksum (SHA-256)
 */
export const calculateChecksum = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Get content type based on file extension
 */
const getContentType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
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
export const fileExists = async (fileKey: string): Promise<boolean> => {
  try {
    await s3.headObject({ Bucket: BUCKET_NAME, Key: fileKey }).promise();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get file metadata
 */
export const getFileMetadata = async (fileKey: string): Promise<AWS.S3.HeadObjectOutput> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
  };

  return s3.headObject(params).promise();
};
