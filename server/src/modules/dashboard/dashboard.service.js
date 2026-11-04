import { dashboardRepository } from './dashboard.repository.js';

export class DashboardService {
  async getStats(user) {
    // If ADMIN, return system-wide stats unless they want scoped stats
    const scopeUserId = user.role === 'ADMIN' ? null : user.id;
    return dashboardRepository.getStats(scopeUserId);
  }

  async getRecentUploads(user, limit = 5) {
    const scopeUserId = user.role === 'ADMIN' ? null : user.id;
    return dashboardRepository.getRecentUploads(scopeUserId, limit);
  }
}

export const dashboardService = new DashboardService();

