
import { fileRepository } from './file.repository.js';
import { fileStorageService } from './file.storage.js';
import { processingService } from '../processing/processing.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../config/logger.js';
import path from 'path';
import fs from 'fs';

const validateSignature = async (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const header = Buffer.alloc(8);

  const handle = await fs.promises.open(file.path, 'r');

  try {
    await handle.read(header, 0, 8, 0);
  } finally {
    await handle.close();
  }

  const isPdf = header.subarray(0, 5).toString('ascii') === '%PDF-';
  const isZip = header[0] === 0x50 && header[1] === 0x4b;
  const isXls = header[0] === 0xd0 && header[1] === 0xcf;

  if (
    (ext === '.pdf' && !isPdf) ||
    (ext === '.docx' && !isZip) ||
    (ext === '.xlsx' && !isZip) ||
    (ext === '.xls' && !isXls)
  ) {
    throw ApiError.badRequest(
      'The uploaded file content does not match its extension.'
    );
  }
};

export class FileService {
  async uploadFile(userId, multerFile) {
    if (!multerFile) {
      throw ApiError.badRequest(
        'No file uploaded. Please provide a file in the "file" field'
      );
    }

    let fileRecord;

    try {
      await validateSignature(multerFile);

      fileRecord = await fileRepository.create({
        userId,
        originalName: multerFile.originalname,
        storedName: multerFile.filename,
        mimeType: multerFile.mimetype,
        size: BigInt(multerFile.size),
        storagePath: multerFile.path,
        status: 'QUEUED',
        processingStage: 'VALIDATING',
        progress: 0,
      });

      logger.info(
        `File uploaded successfully: ${fileRecord.originalName} (${fileRecord.id}) for user ${userId}`
      );

      await processingService.scheduleProcessing(fileRecord.id);

      return fileRecord;
    } catch (err) {
      if (fileRecord) {
        await fileRepository
          .update(fileRecord.id, {
            status: 'FAILED',
            errorMessage: `Queue unavailable: ${err.message}`,
          })
          .catch(() => {});
      }

      if (multerFile.filename) {
        await fileStorageService
          .deleteFile(multerFile.filename)
          .catch(() => {});
      }

      throw err;
    }
  }

  // ADMIN sees all files; USER sees only their own files.
  async getFiles(user, {
    page = 1,
    limit = 10,
    status = 'ALL',
    search = '',
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const userId = user.role === 'ADMIN' ? null : user.id;

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

    if (user.role !== 'ADMIN' && file.userId !== user.id) {
      throw ApiError.forbidden(
        'You do not have permission to access this file'
      );
    }

    return file;
  }

  async getFileStatus(fileId, user) {
    const file = await this.getFileById(fileId, user);

    return {
      fileId: file.id,
      id: file.id,
      filename: file.originalName,
      status: file.status,
      processingStage: file.processingStage,
      progress: file.progress,
      errorMessage: file.errorMessage,
      extractedTextComplete: Boolean(file.extractedText),
      pageCount: file.pageCount,
      completedAt: file.completedAt,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  async getExtractedText(fileId, user) {
    const file = await this.getFileById(fileId, user);

    if (file.status === 'FAILED' && !file.extractedText) {
      throw ApiError.badRequest(
        `Cannot retrieve extracted text: processing failed. Reason: ${file.errorMessage || 'Unknown error'}`
      );
    }

    return {
      fileId: file.id,
      originalName: file.originalName,
      pageCount: file.pageCount || 0,
      extractedText: file.extractedText || '',
      status: file.status,
      processingStage: file.processingStage,
    };
  }

  async reprocessFile(fileId, user) {
    const file = await this.getFileById(fileId, user);

    if (['QUEUED', 'PROCESSING', 'EXTRACTING'].includes(file.status)) {
      throw ApiError.badRequest(
        'File is currently being processed. Please wait for completion.'
      );
    }

    if (!fileStorageService.fileExists(file.storedName)) {
      throw ApiError.notFound(
        'Physical file does not exist on disk storage. Cannot reprocess.'
      );
    }

    const updated = await fileRepository.update(fileId, {
      status: 'QUEUED',
      processingStage: 'VALIDATING',
      progress: 0,
      errorMessage: null,
      completedAt: null,
      extractedText: null,
    });

    logger.info(
      `[FileService] Reprocessing initiated for file: ${file.originalName} (${fileId})`
    );

    await processingService.cancelProcessing(fileId);
    await processingService.scheduleProcessing(fileId);

    return {
      fileId: updated.id,
      status: updated.status,
      processingStage: updated.processingStage,
      progress: updated.progress,
      message: 'Document reprocessing successfully queued.',
    };
  }

  async getFileForDownload(fileId, user) {
    const file = await this.getFileById(fileId, user);

    if (file.status === 'FAILED') {
      throw ApiError.badRequest(
        'Cannot download a file whose processing has failed'
      );
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

    await processingService.cancelProcessing(fileId);

    try {
      await fileStorageService.deleteFile(file.storedName);
    } catch (storageErr) {
      logger.warn(
        `Storage deletion warning for file ${fileId}: ${storageErr.message}`
      );
    }

    await fileRepository.delete(fileId);

    logger.info(
      `File deleted: ${file.originalName} (${fileId}) by user ${user.id}`
    );

    return {
      id: fileId,
      deleted: true,
    };
  }
}

export const fileService = new FileService();
