import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { createError } from '../utils/errors';
import { getStripe, STRIPE_CURRENCY, toMinorUnits } from '../config/stripe';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

// Card orders are only ever created by the Stripe session flow, once payment
// has succeeded; POST /orders is the cash-on-delivery path.
const OFFLINE_PAYMENT_METHOD = 'cod';

function validateOrderInput(items: unknown, shippingAddress: unknown) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createError('Cart is empty');
  }
  const addr = shippingAddress as Record<string, unknown> | undefined;
  if (!addr?.fullName || !addr?.line1 || !addr?.city) {
    throw createError('A valid shipping address is required');
  }
}

interface CreateOrderInput {
  items: Array<{ product: string; quantity: number; size?: string; color?: string }>;
  shippingAddress: Record<string, unknown>;
  paymentMethod?: string;
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  const { items, shippingAddress, paymentMethod = OFFLINE_PAYMENT_METHOD } = input;
  validateOrderInput(items, shippingAddress);
  if (paymentMethod !== OFFLINE_PAYMENT_METHOD) {
    throw createError('Card payments must be started via POST /orders/stripe-session', 400);
  }

  const ids = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: ids } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let itemsTotal = 0;
  const orderItems = items.map((i) => {
    const product = productMap.get(i.product);
    if (!product) throw createError(`Product not found: ${i.product}`, 404);
    const quantity = Math.max(1, Number(i.quantity) || 1);
    if (product.stock < quantity) {
      throw createError(`${product.name} has only ${product.stock} item(s) in stock`, 409);
    }
    const price = product.discountPrice || product.price;
    itemsTotal += price * quantity;
    return {
      product: product._id,
      name: product.name,
      price,
      quantity,
      size: i.size || '',
      color: i.color || '',
      image: product.images[0] || '',
    };
  });

  const shippingFee = itemsTotal >= 1999 ? 0 : 99;
  const total = itemsTotal + shippingFee;

  const order = await Order.create({
    user: userId,
    items: orderItems,
    shippingAddress,
    itemsTotal,
    shippingFee,
    discount: 0,
    total,
    paymentMethod,
    paymentStatus: 'pending',
  });

  // Decrement stock
  const stockUpdates = await Promise.all(
    orderItems.map((item) =>
      Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      )
    )
  );
  if (stockUpdates.some((result) => result.modifiedCount !== 1)) {
    await Promise.all(
      orderItems.map((item, index) =>
        stockUpdates[index]?.modifiedCount === 1
          ? Product.updateOne(
              { _id: item.product },
              { $inc: { stock: item.quantity } }
            )
          : Promise.resolve()
      )
    );
    await Order.deleteOne({ _id: order._id });
    throw createError('One or more products went out of stock. Please try again.', 409);
  }

  return order;
}

export async function createStripeCheckoutSession(
  userId: string,
  input: CreateOrderInput,
  origin: string
) {
  const { items, shippingAddress } = input;
  validateOrderInput(items, shippingAddress);

  const ids = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: ids } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const orderItems = items.map((i) => {
    const product = productMap.get(i.product);
    if (!product) throw createError(`Product not found: ${i.product}`, 404);
    const quantity = Math.max(1, Number(i.quantity) || 1);
    if (product.stock < quantity) {
      throw createError(`${product.name} has only ${product.stock} item(s) in stock`, 409);
    }
    return {
      product: product._id,
      name: product.name,
      price: product.discountPrice || product.price,
      quantity,
      size: i.size || '',
      color: i.color || '',
      image: product.images[0] || '',
    };
  });

  const itemsTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = itemsTotal >= 1999 ? 0 : 99;

  // Mint the id up front so the session can reference the order before the
  // order exists. Creating the order first left a window where a session could
  // be paid for an order that was subsequently rolled back and deleted.
  const orderId = new mongoose.Types.ObjectId();

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      ...orderItems.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: STRIPE_CURRENCY,
          unit_amount: toMinorUnits(item.price),
          product_data: { name: item.name },
        },
      })),
      ...(shippingFee > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency: STRIPE_CURRENCY,
                unit_amount: toMinorUnits(shippingFee),
                product_data: { name: 'Shipping' },
              },
            },
          ]
        : []),
    ],
    success_url: `${origin}/order-success?id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?payment=cancelled`,
    metadata: { orderId: orderId.toString() },
  });

  try {
    const order = await Order.create({
      _id: orderId,
      user: userId,
      items: orderItems,
      shippingAddress,
      itemsTotal,
      shippingFee,
      discount: 0,
      total: itemsTotal + shippingFee,
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
      status: 'pending',
      stripeSessionId: session.id,
    });
    return { url: session.url, orderId: order.id };
  } catch (error) {
    // The session is live but nothing backs it, so expire it before it can be paid.
    await getStripe()
      .checkout.sessions.expire(session.id)
      .catch((expireError) =>
        console.error(`⚠️  Could not expire orphaned checkout session ${session.id}`, expireError)
      );
    throw error;
  }
}

export async function completeStripeOrder(session: {
  id: string;
  payment_status: string;
  amount_total?: number | null;
  metadata?: Record<string, string> | null;
}) {
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== 'paid') return;

  // Atomically claim the order for this session. This is the idempotency
  // barrier: only the first delivery can flip a pending order, so a Stripe
  // retry can never decrement stock a second time.
  const order = await Order.findOneAndUpdate(
    { _id: orderId, stripeSessionId: session.id, paymentStatus: 'pending' },
    { paymentStatus: 'paid', status: 'processing' },
    { new: true }
  );
  if (!order) return; // unknown order, mismatched session, or already processed

  // A session built from tampered or stale prices must never be fulfilled at
  // face value; park it for manual review instead.
  if (
    typeof session.amount_total === 'number' &&
    session.amount_total !== toMinorUnits(order.total)
  ) {
    order.fulfillmentIssue = 'amount_mismatch';
    await order.save();
    console.error(
      `⚠️  Order ${order.id} was paid ${session.amount_total} but totals ${toMinorUnits(order.total)}; needs manual review.`
    );
    return;
  }

  // Reserve stock. Because the claim above runs at most once, this can never
  // double-decrement. An out-of-stock line is not retryable, so record it for
  // manual resolution instead of throwing, which would make Stripe retry
  // forever against an order that is already marked paid.
  const stockUpdates = await Promise.all(
    order.items.map((item) =>
      Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      )
    )
  );
  if (stockUpdates.some((result) => result.modifiedCount !== 1)) {
    order.fulfillmentIssue = 'insufficient_stock';
    await order.save();
    console.error(
      `⚠️  Order ${order.id} was paid but stock could not be reserved; needs manual refund.`
    );
  }
}

/**
 * Close out a checkout that will never be paid. The conditional filter means an
 * order that has already been paid is never cancelled by a late/duplicate event.
 */
export async function failStripeOrder(
  session: { id: string; metadata?: Record<string, string> | null },
  reason: string
) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await Order.findOneAndUpdate(
    { _id: orderId, stripeSessionId: session.id, paymentStatus: 'pending' },
    { paymentStatus: 'failed', status: 'cancelled' },
    { new: true }
  );
  if (order) {
    console.warn(`⚠️  Stripe session ${session.id} ${reason}; order ${order.id} cancelled.`);
  }
}

/**
 * Settles a checkout from the customer's redirect. Stripe sends them back as
 * soon as payment succeeds, which can be well before the webhook is delivered
 * (and never, when the CLI is not forwarding events locally), so the success
 * page calls this to confirm the session and read the order's real state.
 */
export async function confirmStripeCheckout(userId: string, sessionId: string) {
  const session = await getStripe()
    .checkout.sessions.retrieve(sessionId)
    .catch(() => null);
  if (!session) throw createError('Checkout session not found', 404);

  const orderId = session.metadata?.orderId;
  if (!orderId) throw createError('Checkout session is not linked to an order', 404);

  // Ownership is checked before anything is settled, so one customer can never
  // confirm (or read) another customer's session.
  const order = await Order.findOne({
    _id: orderId,
    user: userId,
    stripeSessionId: session.id,
  });
  if (!order) throw createError('Order not found', 404);

  if (session.payment_status === 'paid') {
    await completeStripeOrder(session);
    const settled = await Order.findById(order._id);
    if (settled) return settled;
  }
  return order;
}

export async function listUserOrders(userId: string) {
  return Order.find({ user: userId }).sort({ createdAt: -1 });
}

export async function getUserOrder(userId: string, orderId: string) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw createError('Order not found', 404);
  return order;
}

export async function listAllOrders(status?: string) {
  const filter = status && status !== 'all' ? { status } : {};
  return Order.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'name email');
}

export async function getOrderById(orderId: string) {
  const order = await Order.findById(orderId).populate('user', 'name email');
  if (!order) throw createError('Order not found', 404);
  return order;
}

export async function updateOrderStatus(
  orderId: string,
  { status, paymentStatus }: { status?: string; paymentStatus?: string }
) {
  if (!status || !ORDER_STATUSES.includes(status)) {
    throw createError(`Status must be one of: ${ORDER_STATUSES.join(', ')}`);
  }
  const update: Record<string, unknown> = { status };
  if (paymentStatus) {
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      throw createError('Invalid paymentStatus');
    }
    update.paymentStatus = paymentStatus;
  }

  const order = await Order.findByIdAndUpdate(orderId, update, {
    new: true,
    runValidators: true,
  }).populate('user', 'name email');
  if (!order) throw createError('Order not found', 404);
  return order;
}