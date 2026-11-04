import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRepository } from './auth.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export class AuthService {
  async register(data) {
    const existing = await authRepository.findByEmail(data.email);
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists. Please log in.', [
        { code: 'EMAIL_ALREADY_EXISTS' },
      ]);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = await authRepository.createUser({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role || 'USER',
    });

    const token = this.generateToken(user);
    logger.info(`User registered successfully: ${user.email} (${user.role})`);

    return { user, token };
  }

  async login(email, password) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      logger.warn(`Failed login attempt for nonexistent user: ${email}`);
      throw new ApiError(401, 'No account found with this email. Please sign up to continue.', [
        { code: 'USER_NOT_FOUND' },
      ]);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Failed login attempt (password mismatch) for: ${email}`);
      throw new ApiError(401, 'Invalid email or password', [
        { code: 'INVALID_CREDENTIALS' },
      ]);
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const token = this.generateToken(safeUser);
    logger.info(`User logged in successfully: ${safeUser.email}`);

    return { user: safeUser, token };
  }

  async getMe(userId) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }
}

export const authService = new AuthService();

