import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All admin routes require the admin role
router.use(requireAuth, requireAdmin);

// POST /api/admin/upload  (multipart form, field "images", up to 5 files)
router.post('/upload', upload.array('images', 5), asyncHandler(adminController.upload));

// Dashboard
router.get('/stats', asyncHandler(adminController.getStats));

// Orders
router.get('/orders', asyncHandler(adminController.listOrders));
router.get('/orders/:id', asyncHandler(adminController.getOrder));
router.put('/orders/:id/status', asyncHandler(adminController.updateOrderStatus));

// Products
router.get('/products', asyncHandler(adminController.listProducts));
router.get('/products/:id', asyncHandler(adminController.getProduct));

export default router;