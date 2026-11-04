import { prisma } from '../../config/database.js';

export class UserRepository {
  async findAll({ skip = 0, take = 20 }) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { files: true },
          },
        },
      }),
      prisma.user.count(),
    ]);

    return { users, total };
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { files: true },
        },
      },
    });
  }

  async count() {
    return prisma.user.count();
  }
}

export const userRepository = new UserRepository();

