import { prisma } from '../../config/database.js';

export class DashboardRepository {
  async getStats(userId = null) {
    const where = userId ? { userId } : {};

    const [total, completed, processing, pending, failed, totalUsers] = await Promise.all([
      prisma.file.count({ where }),
      prisma.file.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.file.count({ where: { ...where, status: 'PROCESSING' } }),
      prisma.file.count({ where: { ...where, status: 'QUEUED' } }),
      prisma.file.count({ where: { ...where, status: 'FAILED' } }),
      prisma.user.count(),
    ]);

    // Aggregate storage used
    const aggregateSize = await prisma.file.aggregate({
      where,
      _sum: {
        size: true,
      },
    });

    return {
      total,
      completed,
      processing,
      pending,
      failed,
      totalUsers: userId ? undefined : totalUsers,
      totalStorageBytes: aggregateSize._sum.size || BigInt(0),
    };
  }

  async getRecentUploads(userId = null, limit = 5) {
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

export const dashboardRepository = new DashboardRepository();

