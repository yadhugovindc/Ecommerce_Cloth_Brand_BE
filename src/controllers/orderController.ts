import { Response } from 'express';
import * as orderService from '../services/orderService';
import { Request } from 'express';
import { getStripe, getWebhookSecret } from '../config/stripe';
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

  // Verification and handling are separated on purpose: a bad signature is a
  // 400 that must never be retried, while a handler failure is a 5xx that
  // should be, since settling an order is idempotent.
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      signature,
      getWebhookSecret()
    );
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Invalid webhook');
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await orderService.completeStripeOrder(event.data.object);
        break;
      case 'checkout.session.async_payment_failed':
        await orderService.failStripeOrder(event.data.object, 'async payment failed');
        break;
      case 'checkout.session.expired':
        await orderService.failStripeOrder(event.data.object, 'checkout expired');
        break;
    }
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Stripe webhook handling failed:', error);
    res.status(500).json({ message: 'Webhook handling failed' });
  }
}

export async function verifyStripeSession(req: AuthRequest, res: Response) {
  const order = await orderService.confirmStripeCheckout(
    req.user!.id,
    req.params.sessionId
  );
  res.json({ order });
}

export async function listMine(req: AuthRequest, res: Response) {
  const orders = await orderService.listUserOrders(req.user!.id);
  res.json({ orders });
}

export async function getMine(req: AuthRequest, res: Response) {
  const order = await orderService.getUserOrder(req.user!.id, req.params.id);
  res.json({ order });
}