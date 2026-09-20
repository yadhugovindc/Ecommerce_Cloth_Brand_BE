import { Response } from 'express';
import * as orderService from '../services/orderService';
import { Request } from 'express';
import { getStripe } from '../config/stripe';
import { AuthRequest } from '../middleware/auth';

export async function create(req: AuthRequest, res: Response) {
  const { items, shippingAddress, paymentMethod } = req.body || {};
  const order = await orderService.createOrder(req.user!.id, {
    items,
    shippingAddress,
    paymentMethod,
  });
  res.status(201).json({ order });
}

export async function createStripeSession(req: AuthRequest, res: Response) {
  const { items, shippingAddress } = req.body || {};
  const origin = (process.env.CLIENT_ORIGIN || 'http://localhost:3000').split(',')[0].trim();
  const result = await orderService.createStripeCheckoutSession(
    req.user!.id,
    { items, shippingAddress, paymentMethod: 'stripe' },
    origin
  );
  res.status(201).json(result);
}

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) {
    res.status(400).send('Missing Stripe signature');
    return;
  }

  try {
    const event = getStripe().webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
    if (event.type === 'checkout.session.completed') {
      await orderService.completeStripeOrder(event.data.object);
    }
    res.json({ received: true });
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Invalid webhook');
  }
}

export async function listMine(req: AuthRequest, res: Response) {
  const orders = await orderService.listUserOrders(req.user!.id);
  res.json({ orders });
}

export async function getMine(req: AuthRequest, res: Response) {
  const order = await orderService.getUserOrder(req.user!.id, req.params.id);
  res.json({ order });
}