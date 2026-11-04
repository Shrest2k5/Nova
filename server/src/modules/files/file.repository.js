import { prisma } from '../../config/database.js';

export class FileRepository {
  async create(data) {
    return prisma.file.create({
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findById(id) {
    return prisma.file.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findByUser(userId, { skip = 0, take = 10, status, search }) {
    const where = {
      userId,
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(search
        ? {
            originalName: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.file.count({ where }),
    ]);

    return { files, total };
  }

  async update(id, data) {
    return prisma.file.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return prisma.file.delete({
      where: { id },
    });
  }

  async getStats(userId = null) {
    const where = userId ? { userId } : {};

    const [total, completed, processing, pending, failed] = await Promise.all([
      prisma.file.count({ where }),
      prisma.file.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.file.count({ where: { ...where, status: 'PROCESSING' } }),
      prisma.file.count({ where: { ...where, status: 'PENDING' } }),
      prisma.file.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    return {
      total,
      completed,
      processing,
      pending,
      failed,
    };
  }

  async getRecent(userId = null, limit = 5) {
    const where = userId ? { userId } : {};

    return prisma.file.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}

export const fileRepository = new FileRepository();

