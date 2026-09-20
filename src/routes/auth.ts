import { Router } from 'express';
import * as authController from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// POST /api/auth/register
router.post('/register', asyncHandler(authController.register));

// POST /api/auth/login
router.post('/login', asyncHandler(authController.login));

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
router.get('/me', requireAuth, asyncHandler(authController.me));

export default router;