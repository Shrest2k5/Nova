import { dashboardService } from './dashboard.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export class DashboardController {
  getStats = asyncHandler(async (req, res) => {
    const stats = await dashboardService.getStats(req.user);
    return res
      .status(200)
      .json(ApiResponse.success(stats, 'Dashboard statistics retrieved successfully'));
  });

  getRecentUploads = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 5;
    const recent = await dashboardService.getRecentUploads(req.user, limit);
    return res
      .status(200)
      .json(ApiResponse.success(recent, 'Recent uploads retrieved successfully'));
  });
}

export const dashboardController = new DashboardController();

