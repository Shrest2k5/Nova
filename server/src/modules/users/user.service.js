import { userRepository } from './user.repository.js';
import { ApiError } from '../../utils/ApiError.js';

export class UserService {
  async listUsers(page = 1, limit = 20) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const { users, total } = await userRepository.findAll({ skip, take: limitNum });

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getUserById(id, requestingUser) {
    // If not admin and not self, reject
    if (requestingUser.role !== 'ADMIN' && requestingUser.id !== id) {
      throw ApiError.forbidden('You do not have permission to view this user profile');
    }

    const user = await userRepository.findById(id);
    if (!user) {
      throw ApiError.notFound(`User with id '${id}' not found`);
    }

    return user;
  }
}

export const userService = new UserService();

