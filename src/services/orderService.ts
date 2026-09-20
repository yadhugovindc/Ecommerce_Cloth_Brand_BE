import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { createError } from '../utils/errors';
import { getStripe } from '../config/stripe';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

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
  const { items, shippingAddress, paymentMethod = 'cod' } = input;
  validateOrderInput(items, shippingAddress);

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
  const order = await Order.create({
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
  });

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        ...orderItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: 'inr',
            unit_amount: Math.round(item.price * 100),
            product_data: { name: item.name },
          },
        })),
        ...(shippingFee > 0
          ? [{
              quantity: 1,
              price_data: {
                currency: 'inr' as const,
                unit_amount: shippingFee * 100,
                product_data: { name: 'Shipping' },
              },
            }]
          : []),
      ],
      success_url: `${origin}/order-success?id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?payment=cancelled`,
      metadata: { orderId: order.id },
    });

    await Order.updateOne({ _id: order._id }, { stripeSessionId: session.id });
    return { url: session.url, orderId: order.id };
  } catch (error) {
    await Order.deleteOne({ _id: order._id });
    throw error;
  }
}

export async function completeStripeOrder(session: {
  id: string;
  payment_status: string;
  metadata?: Record<string, string> | null;
}) {
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== 'paid') return;

  const order = await Order.findOne({ _id: orderId, stripeSessionId: session.id });
  if (!order || order.paymentStatus === 'paid') return;

  const stockUpdates = await Promise.all(
    order.items.map((item) =>
      Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      )
    )
  );
  if (stockUpdates.some((result) => result.modifiedCount !== 1)) {
    throw createError('One or more products went out of stock after payment', 409);
  }

  order.paymentStatus = 'paid';
  order.status = 'processing';
  await order.save();
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