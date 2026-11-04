import { userService } from './user.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export class UserController {
  getUsers = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await userService.listUsers(page, limit);
    return res
      .status(200)
      .json(ApiResponse.success(result.users, 'Users retrieved successfully', 200, result.pagination));
  });

  getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await userService.getUserById(id, req.user);
    return res
      .status(200)
      .json(ApiResponse.success(user, 'User retrieved successfully'));
  });
}

export const userController = new UserController();

