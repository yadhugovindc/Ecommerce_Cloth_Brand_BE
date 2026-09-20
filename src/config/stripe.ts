import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY in backend/.env');
    client = new Stripe(secretKey);
  }
  return client;
}