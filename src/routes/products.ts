import { Router } from 'express';
import * as productController from '../controllers/productController';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/products?category=&search=&sort=&min=&max=&featured=&page=&limit=
router.get('/', asyncHandler(productController.list));

// GET /api/products/featured  (must precede /:slug)
router.get('/featured', asyncHandler(productController.listFeatured));

// GET /api/products/:slug
router.get('/:slug', asyncHandler(productController.getBySlug));

// Admin CRUD
router.post('/', requireAuth, requireAdmin, asyncHandler(productController.create));
router.put('/:id', requireAuth, requireAdmin, asyncHandler(productController.update));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(productController.remove));

export default router;