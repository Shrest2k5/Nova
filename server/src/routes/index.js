import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import fileRoutes from '../modules/files/file.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import { checkDatabaseHealth } from '../config/database.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Health check endpoint
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const isDbHealthy = await checkDatabaseHealth();
    const dbStatus = isDbHealthy ? 'healthy' : 'unhealthy';

    const healthData = {
      status: isDbHealthy ? 'OK' : 'DEGRADED',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'novastat-backend',
    };

    const statusCode = isDbHealthy ? 200 : 503;
    return res.status(statusCode).json(ApiResponse.success(healthData, 'Service health status', statusCode));
  })
);

// Module routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/files', fileRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;

