import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All customer order routes require auth
router.use(requireAuth);

router.post('/', asyncHandler(orderController.create));
router.post('/stripe-session', asyncHandler(orderController.createStripeSession));
router.get('/stripe-session/:sessionId', asyncHandler(orderController.verifyStripeSession));
router.get('/', asyncHandler(orderController.listMine));
router.get('/:id', asyncHandler(orderController.getMine));

export default router;