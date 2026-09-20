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

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET in backend/.env');
  return secret;
}

/** Catalog prices are stored in rupees; Stripe charges the currency's minor unit. */
export const STRIPE_CURRENCY = 'inr';

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Called at boot. Without these the checkout page still offers a card option
 * that can never complete, so misfires would surface one request at a time
 * instead of once, loudly, at startup.
 */
export function assertStripeConfig() {
  const missing = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'].filter(
    (key) => !process.env[key]
  );
  if (missing.length === 0) return;

  const message = `Missing required Stripe env var(s): ${missing.join(', ')}`;
  if (process.env.NODE_ENV === 'production') throw new Error(message);
  console.warn(`⚠️  ${message} — card payments cannot be completed.`);
}