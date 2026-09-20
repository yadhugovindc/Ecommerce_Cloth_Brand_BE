import { Router } from 'express';
import { stripeWebhook } from '../controllers/orderController';

const router = Router();
router.post('/webhook', stripeWebhook);

export default router;