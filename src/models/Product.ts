import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    brand: { type: String, default: 'ATELIER' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    images: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    sizes: { type: [String], default: ['S', 'M', 'L', 'XL'] },
    material: { type: String, default: '' },
    gender: { type: String, enum: ['women', 'men', 'unisex'], default: 'unisex' },
    stock: { type: Number, required: true, default: 0, min: 0 },
    sku: { type: String, unique: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isSale: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });

export interface ProductDoc extends mongoose.Document {
  name: string;
  slug: string;
  description: string;
  brand: string;
  category: mongoose.Types.ObjectId;
  subCategory: string;
  price: number;
  discountPrice?: number;
  images: string[];
  colors: string[];
  sizes: string[];
  material: string;
  gender: 'women' | 'men' | 'unisex';
  stock: number;
  sku: string;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isSale: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const Product = mongoose.model<ProductDoc>('Product', productSchema);