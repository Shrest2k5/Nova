import { prisma } from '../../config/database.js';

export class ProcessingRepository {
  async updateStatusAndProgress(fileId, status, progress, errorMessage = null, completedAt = null) {
    return prisma.file.update({
      where: { id: fileId },
      data: {
        status,
        progress,
        errorMessage,
        completedAt,
      },
    });
  }

  async updateStageAndProgress(fileId, data) {
    return prisma.file.update({
      where: { id: fileId },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.stage !== undefined ? { processingStage: data.stage } : {}),
        ...(data.progress !== undefined ? { progress: data.progress } : {}),
        ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
        ...(data.extractedText !== undefined ? { extractedText: data.extractedText } : {}),
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.pageCount !== undefined ? { pageCount: data.pageCount } : {}),
        ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
      },
    });
  }

  async saveExtractedText(fileId, extractedText, pageCount) {
    return prisma.file.update({
      where: { id: fileId },
      data: {
        extractedText,
        pageCount,
      },
    });
  }

  async saveSummary(fileId, summary) {
    return prisma.file.update({
      where: { id: fileId },
      data: {
        summary,
      },
    });
  }

  async getFileStatus(fileId) {
    return prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        status: true,
        processingStage: true,
        progress: true,
        errorMessage: true,
        completedAt: true,
        updatedAt: true,
      },
    });
  }

  async findFileById(fileId) {
    return prisma.file.findUnique({
      where: { id: fileId },
    });
  }
}

export const processingRepository = new ProcessingRepository();
