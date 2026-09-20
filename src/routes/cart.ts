import { Router } from 'express';
import * as cartController from '../controllers/cartController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All cart routes require auth
router.use(requireAuth);

router.get('/', asyncHandler(cartController.get));
router.post('/add', asyncHandler(cartController.add));
router.post('/merge', asyncHandler(cartController.merge));
router.put('/update', asyncHandler(cartController.update));
router.delete('/remove', asyncHandler(cartController.remove));

export default router;