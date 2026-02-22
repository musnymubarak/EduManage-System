import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, authController.getProfile);

// @route   POST /api/auth/change-password
// @desc    Change password
// @access  Private
router.post(
  '/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validate,
  authController.changePassword
);

// @route   POST /api/auth/refresh
// @desc    Refresh token
// @access  Private
router.post('/refresh', authenticateToken, authController.refreshToken);

export default router;
