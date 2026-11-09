import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Ensure uploads directory exists
if (!fs.existsSync(env.UPLOAD_PATH)) {
  fs.mkdirSync(env.UPLOAD_PATH, { recursive: true });
}

// Allowed extensions map corresponding to allowed MIME types
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.txt', '.docx', '.xlsx', '.xls', '.png', '.jpg', '.jpeg'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    // Generate secure random prefix + sanitize original filename
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);

    const storedName = `${Date.now()}-${randomHex}-${sanitizedBase}${ext}`;
    cb(null, storedName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  // Validate file extension
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      ApiError.badRequest(
        `Invalid file extension '${ext}'. Allowed extensions: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`
      ),
      false
    );
  }

  // Validate MIME type
  if (!env.ALLOWED_MIME_TYPES_LIST.includes(mime)) {
    return cb(
      ApiError.badRequest(
        `Invalid file type '${mime}'. Allowed types: PDF, DOCX, TXT, XLSX, XLS, PNG, JPG, JPEG`
      ),
      false
    );
  }

  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE, // 50MB default
    files: 1, // single file upload per request
  },
  fileFilter,
});

export { ALLOWED_EXTENSIONS };

