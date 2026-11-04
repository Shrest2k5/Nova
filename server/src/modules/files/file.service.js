import { fileRepository } from './file.repository.js';
import { fileStorageService } from './file.storage.js';
import { processingService } from '../processing/processing.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../config/logger.js';

export class FileService {
  async uploadFile(userId, multerFile) {
    if (!multerFile) {
      throw ApiError.badRequest('No file uploaded. Please provide a file in the "file" field');
    }

    try {
      // Create file record in PostgreSQL with status PENDING
      const fileRecord = await fileRepository.create({
        userId,
        originalName: multerFile.originalname,
        storedName: multerFile.filename,
        mimeType: multerFile.mimetype,
        size: BigInt(multerFile.size),
        storagePath: multerFile.path,
        status: 'PENDING',
        progress: 0,
      });

      logger.info(`File uploaded successfully: ${fileRecord.originalName} (${fileRecord.id}) for user ${userId}`);

      // Initiate background processing asynchronously (non-blocking)
      processingService.scheduleProcessing(fileRecord.id);

      return fileRecord;
    } catch (err) {
      // Clean up orphaned disk file if database record creation fails
      if (multerFile.filename) {
        await fileStorageService.deleteFile(multerFile.filename).catch(() => {});
      }
      throw err;
    }
  }

  async getFiles(userId, { page = 1, limit = 10, status = 'ALL', search = '' }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const { files, total } = await fileRepository.findByUser(userId, {
      skip,
      take: limitNum,
      status,
      search,
    });

    return {
      files,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async getFileById(fileId, user) {
    const file = await fileRepository.findById(fileId);
    if (!file) {
      throw ApiError.notFound(`File with id '${fileId}' not found`);
    }

    // Role-based ownership check: only owner or ADMIN can view file
    if (user.role !== 'ADMIN' && file.userId !== user.id) {
      throw ApiError.forbidden('You do not have permission to access this file');
    }

    return file;
  }

  async getFileStatus(fileId, user) {
    const file = await this.getFileById(fileId, user);
    return {
      id: file.id,
      filename: file.originalName,
      status: file.status,
      progress: file.progress,
      errorMessage: file.errorMessage,
      completedAt: file.completedAt,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  async getFileForDownload(fileId, user) {
    const file = await this.getFileById(fileId, user);

    if (file.status === 'FAILED') {
      throw ApiError.badRequest('Cannot download a file whose processing has failed');
    }

    if (!fileStorageService.fileExists(file.storedName)) {
      throw ApiError.notFound('Physical file not found on disk storage');
    }

    const stream = fileStorageService.getFileStream(file.storedName);
    return {
      stream,
      file,
    };
  }

  async deleteFile(fileId, user) {
    const file = await this.getFileById(fileId, user);

    // Cancel active background processing if running
    processingService.cancelProcessing(fileId);

    // Remove from physical storage
    try {
      await fileStorageService.deleteFile(file.storedName);
    } catch (storageErr) {
      logger.warn(`Storage deletion warning for file ${fileId}: ${storageErr.message}`);
    }

    // Delete record from PostgreSQL
    await fileRepository.delete(fileId);
    logger.info(`File deleted: ${file.originalName} (${fileId}) by user ${user.id}`);

    return { id: fileId, deleted: true };
  }
}

export const fileService = new FileService();

