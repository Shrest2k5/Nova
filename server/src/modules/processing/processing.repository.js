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

  async getFileStatus(fileId) {
    return prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        status: true,
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

