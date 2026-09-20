import { Router } from 'express';
import * as categoryController from '../controllers/categoryController';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/categories
router.get('/', asyncHandler(categoryController.list));

// Admin CRUD
router.post('/', requireAuth, requireAdmin, asyncHandler(categoryController.create));
router.put('/:id', requireAuth, requireAdmin, asyncHandler(categoryController.update));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(categoryController.remove));

export default router;