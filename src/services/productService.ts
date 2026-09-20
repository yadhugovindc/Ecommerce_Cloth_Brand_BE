import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { createError } from '../utils/errors';
import slugify from '../utils/slugify';

export interface ListProductsQuery {
  category?: string;
  search?: string;
  sort?: string;
  min?: string;
  max?: string;
  featured?: string;
  page?: string;
  limit?: string;
}

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { rating: -1 },
  popular: { reviewCount: -1 },
};

export async function listProducts(query: ListProductsQuery = {}) {
  const {
    category,
    search,
    sort = 'newest',
    min,
    max,
    featured,
    page = '1',
    limit = '24',
  } = query;

  const filter: Record<string, unknown> = {};

  if (category) {
    const cat = await Category.findOne({ slug: category });
    if (!cat) {
      return { products: [], total: 0, page: 1, pages: 1 };
    }
    filter.category = cat._id;
  }
  if (search) {
    filter.$text = { $search: search };
  }
  if (min) filter.price = { ...(filter.price as object), $gte: Number(min) };
  if (max) filter.price = { ...(filter.price as object), $lte: Number(max) };
  if (featured === 'true') filter.isFeatured = true;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(48, Number(limit) || 24);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(SORT_MAP[sort] || SORT_MAP.newest)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  };
}

export async function listFeatured() {
  return Product.find({ isFeatured: true })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(8);
}

export async function getProductBySlug(slug: string) {
  const product = await Product.findOne({ slug }).populate('category', 'name slug');
  if (!product) throw createError('Product not found', 404);
  return product;
}

export async function getProductById(id: string) {
  const product = await Product.findById(id).populate('category', 'name slug');
  if (!product) throw createError('Product not found', 404);
  return product;
}

export async function listAllForAdmin(search?: string) {
  const filter = search
    ? { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    : {};
  return Product.find(filter)
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(500);
}

export async function createProduct(data: Record<string, unknown>) {
  const payload = { ...data };
  if (!payload.slug && payload.name) payload.slug = slugify(String(payload.name));
  return Product.create(payload);
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  const product = await Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!product) throw createError('Product not found', 404);
  return product;
}

export async function deleteProduct(id: string) {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw createError('Product not found', 404);
}