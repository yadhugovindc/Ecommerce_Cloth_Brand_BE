import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { Order } from '../models/Order';
import { User } from '../models/User';

const categories = [
  { name: 'Women', slug: 'women', description: 'Womenswear edit' },
  { name: 'Men', slug: 'men', description: 'Menswear edit' },
  { name: 'Dresses', slug: 'dresses', description: 'Dresses & gowns' },
  { name: 'Tops', slug: 'tops', description: 'Shirts, tees & knitwear' },
  { name: 'Bottoms', slug: 'bottoms', description: 'Trousers & skirts' },
];

interface SeedProduct {
  name: string;
  subCategory: string;
  categorySlug: string;
  gender: 'women' | 'men' | 'unisex';
  price: number;
  discountPrice?: number;
  colors: string[];
  sizes: string[];
  material: string;
  stock: number;
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
  isNew?: boolean;
  isSale?: boolean;
  description: string;
}

const products: SeedProduct[] = [
  {
    name: 'Linen Relaxed Shirt',
    subCategory: 'Shirts',
    categorySlug: 'men',
    gender: 'men',
    price: 2490,
    discountPrice: 2190,
    colors: ['Natural', 'White', 'Black'],
    sizes: ['S', 'M', 'L', 'XL'],
    material: '100% European Linen',
    stock: 42,
    rating: 4.6,
    reviewCount: 128,
    isFeatured: true,
    isNew: true,
    isSale: true,
    description:
      'A relaxed, unstructured shirt cut from breathable European linen. Sits softly off the body with a gentle drape — the quiet staple of an easy summer wardrobe.',
  },
  {
    name: 'Wool Blend Overcoat',
    subCategory: 'Outerwear',
    categorySlug: 'men',
    gender: 'men',
    price: 8990,
    colors: ['Charcoal', 'Camel', 'Black'],
    sizes: ['S', 'M', 'L', 'XL'],
    material: '70% Wool, 30% Polyester',
    stock: 18,
    rating: 4.8,
    reviewCount: 64,
    isFeatured: true,
    description:
      'A long, tailored overcoat in a soft wool blend with a clean shoulder line and horn buttons. Cut for layering over tailoring or knitwear.',
  },
  {
    name: 'Cotton Poplin Shirt',
    subCategory: 'Shirts',
    categorySlug: 'men',
    gender: 'men',
    price: 1890,
    colors: ['White', 'Light Blue', 'Oat'],
    sizes: ['S', 'M', 'L', 'XL'],
    material: '100% Cotton Poplin',
    stock: 56,
    rating: 4.4,
    reviewCount: 201,
    description:
      'A crisp everyday shirt in garment-washed cotton poplin. Slightly softened for comfort with a precise, classic collar.',
  },
  {
    name: 'Tailored Pleated Trousers',
    subCategory: 'Trousers',
    categorySlug: 'men',
    gender: 'men',
    price: 3290,
    colors: ['Grey', 'Navy', 'Black'],
    sizes: ['28', '30', '32', '34', '36'],
    material: '98% Cotton, 2% Elastane',
    stock: 34,
    rating: 4.5,
    reviewCount: 87,
    isFeatured: true,
    description:
      'Single-pleat tailored trousers with a tapered leg and extended waistband. A refined silhouette that moves with you.',
  },
  {
    name: 'Silk Slip Dress',
    subCategory: 'Dresses',
    categorySlug: 'dresses',
    gender: 'women',
    price: 4890,
    colors: ['Champagne', 'Black', 'Sage'],
    sizes: ['XS', 'S', 'M', 'L'],
    material: '100% Silk Satin',
    stock: 22,
    rating: 4.9,
    reviewCount: 153,
    isFeatured: true,
    description:
      'A bias-cut silk slip dress with delicate adjustable straps and a fluid hem. Effortless glamour, evening to day.',
  },
  {
    name: 'Cashmere Crewneck Sweater',
    subCategory: 'Knitwear',
    categorySlug: 'women',
    gender: 'women',
    price: 5990,
    colors: ['Oat', 'Grey Marl', 'Black'],
    sizes: ['XS', 'S', 'M', 'L'],
    material: '100% Cashmere',
    stock: 26,
    rating: 4.7,
    reviewCount: 96,
    isFeatured: true,
    isNew: true,
    description:
      'A featherweight crewneck knitted from Grade-A Mongolian cashmere. Barely there, endlessly warm.',
  },
  {
    name: 'Wide-Leg Linen Trousers',
    subCategory: 'Trousers',
    categorySlug: 'women',
    gender: 'women',
    price: 2790,
    colors: ['Natural', 'Black', 'Olive'],
    sizes: ['XS', 'S', 'M', 'L'],
    material: '100% Linen',
    stock: 48,
    rating: 4.5,
    reviewCount: 74,
    description:
      'High-rise wide-leg trousers with a fluid drape and side seam pockets. The warm-weather counterpart to tailoring.',
  },
  {
    name: 'Cropped Tweed Jacket',
    subCategory: 'Outerwear',
    categorySlug: 'women',
    gender: 'women',
    price: 6490,
    colors: ['Cream', 'Charcoal', 'Taupe'],
    sizes: ['XS', 'S', 'M', 'L'],
    material: 'Wool-blend Tweed',
    stock: 15,
    rating: 4.8,
    reviewCount: 58,
    isFeatured: true,
    description:
      'A boxy, cropped tweed jacket with contrast trim and gold-tone buttons. Instant polish over anything from denim to silk.',
  },
  {
    name: 'Pleated Midi Skirt',
    subCategory: 'Skirts',
    categorySlug: 'bottoms',
    gender: 'women',
    price: 3490,
    colors: ['Camel', 'Black', 'Forest'],
    sizes: ['XS', 'S', 'M', 'L'],
    material: 'Crepe De Chine',
    stock: 31,
    rating: 4.6,
    reviewCount: 69,
    description:
      'A midi-length pleated skirt in weightless crepe with a flat elasticated waist. Moves like water.',
  },
  {
    name: 'Ribbed Knit Top',
    subCategory: 'Tops',
    categorySlug: 'tops',
    gender: 'women',
    price: 1490,
    colors: ['White', 'Black', 'Chocolate'],
    sizes: ['XS', 'S', 'M', 'L'],
    material: '95% Cotton, 5% Elastane',
    stock: 64,
    rating: 4.3,
    reviewCount: 112,
    isNew: true,
    description:
      'A fitted ribbed knit top with a square neckline. The base layer that elevates everything else.',
  },
  {
    name: 'Oversized Cotton Tee',
    subCategory: 'Tees',
    categorySlug: 'tops',
    gender: 'unisex',
    price: 990,
    colors: ['White', 'Black', 'Oat'],
    sizes: ['S', 'M', 'L', 'XL'],
    material: '100% Organic Cotton',
    stock: 120,
    rating: 4.4,
    reviewCount: 340,
    description:
      'A heavyweight, garment-dyed tee with a boxy oversized fit and dropped shoulders. The uniform, done properly.',
  },
  {
    name: 'Chunky Wool Cardigan',
    subCategory: 'Knitwear',
    categorySlug: 'women',
    gender: 'women',
    price: 4290,
    discountPrice: 3690,
    colors: ['Cream', 'Camel', 'Grey'],
    sizes: ['XS', 'S', 'M', 'L'],
    material: '100% Merino Wool',
    stock: 20,
    rating: 4.7,
    reviewCount: 83,
    isNew: true,
    isSale: true,
    description:
      'A chunky ribbed cardigan in soft merino with leather-look buttons. Slouchy, warm, and forever in rotation.',
  },
];

async function seed() {
  await connectDB();

  console.log('🧹 Clearing existing data...');
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({}),
  ]);

  console.log('🏷️  Creating categories...');
  const createdCategories = await Category.insertMany(categories);
  const catBySlug = new Map(createdCategories.map((c) => [c.slug, c._id]));

  console.log('👕 Creating products...');
  await Product.insertMany(
    products.map((p) => ({
      name: p.name,
      slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: p.description,
      brand: 'ATELIER',
      category: catBySlug.get(p.categorySlug),
      subCategory: p.subCategory,
      price: p.price,
      discountPrice: p.discountPrice,
      images: [`/images/products/${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`],
      colors: p.colors,
      sizes: p.sizes,
      material: p.material,
      gender: p.gender,
      stock: p.stock,
      sku: `ATL-${Math.floor(1000 + Math.random() * 9000)}`,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isFeatured: p.isFeatured || false,
      isNewArrival: p.isNew || false,
      isSale: p.isSale || false,
    }))
  );

  console.log('👤 Creating demo users...');
  const admin = await User.findOneAndUpdate(
    { email: 'admin@atelier.com' },
    {
      name: 'Atelier Admin',
      email: 'admin@atelier.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
    },
    { upsert: true, new: true }
  );
  const customer = await User.findOneAndUpdate(
    { email: 'demo@atelier.com' },
    {
      name: 'Demo Customer',
      email: 'demo@atelier.com',
      password: await bcrypt.hash('demo123', 10),
      role: 'customer',
    },
    { upsert: true, new: true }
  );

  console.log(`
✅ Seed complete!

  Categories: ${createdCategories.length}
  Products:   ${products.length}

  Demo accounts:
  ─────────────
  Admin    → admin@atelier.com / admin123
  Customer → demo@atelier.com / demo123
  `);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});