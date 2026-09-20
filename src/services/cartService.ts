import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { createError } from '../utils/errors';

const CART_POPULATE = {
  path: 'items.product',
  select: 'name slug price discountPrice images colors sizes stock',
};

async function findOrCreateCart(userId: string) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

export async function getCart(userId: string) {
  const cart = await findOrCreateCart(userId);
  await cart.populate(CART_POPULATE);
  return cart;
}

export async function addItem(
  userId: string,
  { product, quantity = 1, size = '', color = '' }: Record<string, unknown>
) {
  if (!product) throw createError('product is required');

  const cart = await findOrCreateCart(userId);
  const productId = String(product);

  const existing = cart.items.find(
    (i) => i.product.toString() === productId && i.size === size && i.color === color
  );

  if (existing) {
    existing.quantity += Number(quantity) || 1;
  } else {
    cart.items.push({
      product: productId as never,
      quantity: Number(quantity) || 1,
      size: String(size),
      color: String(color),
    });
  }

  await cart.save();
  await cart.populate(CART_POPULATE);
  return cart;
}

export async function mergeItems(userId: string, items: unknown) {
  if (!Array.isArray(items)) throw createError('Cart items must be an array');

  const cart = await findOrCreateCart(userId);
  for (const rawItem of items) {
    const item = rawItem as Record<string, unknown>;
    const productId = String(item.product || '');
    const product = await Product.findById(productId);
    if (!product) throw createError(`Product not found: ${productId}`, 404);
    if (product.stock < 1) throw createError(`${product.name} is out of stock`, 409);

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const size = String(item.size || '');
    const color = String(item.color || '');
    const existing = cart.items.find(
      (cartItem) =>
        cartItem.product.toString() === productId &&
        cartItem.size === size &&
        cartItem.color === color
    );

    if (existing) {
      existing.quantity = Math.min(product.stock, existing.quantity + quantity);
    } else {
      cart.items.push({
        product: product._id,
        quantity: Math.min(product.stock, quantity),
        size,
        color,
      });
    }
  }

  await cart.save();
  await cart.populate(CART_POPULATE);
  return cart;
}

export async function updateItem(userId: string, { index, quantity }: Record<string, unknown>) {
  const cart = await Cart.findOne({ user: userId });
  const itemIndex = Number(index);
  if (!cart || !cart.items[itemIndex]) {
    throw createError('Cart item not found', 404);
  }
  if (Number(quantity) < 1) {
    throw createError('Quantity must be at least 1');
  }
  cart.items[itemIndex].quantity = Number(quantity);
  await cart.save();
  await cart.populate(CART_POPULATE);
  return cart;
}

export async function removeItem(userId: string, { index }: Record<string, unknown>) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw createError('Cart not found', 404);
  }
  cart.items.splice(Number(index), 1);
  await cart.save();
  await cart.populate(CART_POPULATE);
  return cart;
}