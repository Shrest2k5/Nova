import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { authRepository } from '../modules/auth/auth.repository.js';
import { logger } from '../config/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check HttpOnly cookie first
    if (req.cookies && req.cookies.novastat_token) {
      token = req.cookies.novastat_token;
    }
    // Fall back to Authorization: Bearer <token> header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw ApiError.unauthorized('Authentication token missing or invalid');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      logger.warn(`JWT verification failed: ${err.message}`);
      throw ApiError.unauthorized('Invalid or expired authentication token');
    }

    const user = await authRepository.findById(decoded.userId || decoded.id);

    if (!user) {
      throw ApiError.unauthorized('Authenticated user no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
