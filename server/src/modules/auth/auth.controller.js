import { authService } from './auth.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import { env } from '../../config/env.js';

/** Cookie options shared by login, register, and logout */
const cookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

export class AuthController {
  register = asyncHandler(async (req, res) => {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.register(validatedData);

    // Set HttpOnly cookie with JWT
    res.cookie('novastat_token', result.token, cookieOptions());

    return res
      .status(201)
      .json(ApiResponse.created(result, 'User registered successfully'));
  });

  login = asyncHandler(async (req, res) => {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData.email, validatedData.password);

    // Set HttpOnly cookie with JWT
    res.cookie('novastat_token', result.token, cookieOptions());

    return res
      .status(200)
      .json(ApiResponse.success(result, 'Login successful'));
  });

  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id);
    return res
      .status(200)
      .json(ApiResponse.success(user, 'Current user profile fetched successfully'));
  });

  logout = asyncHandler(async (req, res) => {
    // Clear the HttpOnly cookie
    res.clearCookie('novastat_token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res
      .status(200)
      .json(ApiResponse.success(null, 'Logged out successfully'));
  });
}

export const authController = new AuthController();
