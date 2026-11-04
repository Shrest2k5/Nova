import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = Router();

// List all users: ADMIN only
router.get('/', authenticate, authorize('ADMIN'), userController.getUsers);

// Get single user: ADMIN or Self
router.get('/:id', authenticate, userController.getUserById);

export default router;

