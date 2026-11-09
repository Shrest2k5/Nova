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
    const mapped = {};
    for (const key of ['status', 'progress', 'errorMessage', 'extractedText', 'pageCount', 'completedAt']) {
      if (data[key] !== undefined) mapped[key] = data[key];
    }
    if (data.stage !== undefined) mapped.processingStage = data.stage;
    return prisma.file.update({ where: { id: fileId }, data: mapped });
  }

  async saveExtractedText(fileId, extractedText, pageCount) {
    return prisma.file.update({
      where: { id: fileId },
      data: {
        extractedText,
        pageCount,
        status: 'COMPLETED',
        processingStage: 'COMPLETED',
        progress: 100,
        errorMessage: null,
        completedAt: new Date(),
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
