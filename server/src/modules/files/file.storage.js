import fs from 'fs';
import path from 'path';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/ApiError.js';

export class FileStorageService {
  constructor(basePath = env.UPLOAD_PATH) {
    this.basePath = basePath;
    this.ensureDirectory();
  }

  ensureDirectory() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  getFilePath(storedName) {
    // Prevent path traversal attacks
    const safeName = path.basename(storedName);
    const resolvedPath = path.resolve(this.basePath, safeName);
    if (!resolvedPath.startsWith(this.basePath)) {
      throw ApiError.badRequest('Invalid file storage path');
    }
    return resolvedPath;
  }

  fileExists(storedName) {
    const filePath = this.getFilePath(storedName);
    return fs.existsSync(filePath);
  }

  async deleteFile(storedName) {
    try {
      const filePath = this.getFilePath(storedName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`Deleted stored file from disk: ${storedName}`);
      }
    } catch (err) {
      logger.error(`Failed to delete stored file: ${storedName}`, { error: err.message });
      throw ApiError.internal('Failed to delete physical file from storage');
    }
  }

  getFileStream(storedName) {
    const filePath = this.getFilePath(storedName);
    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound('Physical file does not exist on disk');
    }
    return fs.createReadStream(filePath);
  }

  getFileSize(storedName) {
    const filePath = this.getFilePath(storedName);
    const stats = fs.statSync(filePath);
    return stats.size;
  }
}

export const fileStorageService = new FileStorageService();

