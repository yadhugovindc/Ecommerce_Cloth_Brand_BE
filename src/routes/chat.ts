import { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/', optionalAuth, asyncHandler(chatController.send));

export default router;