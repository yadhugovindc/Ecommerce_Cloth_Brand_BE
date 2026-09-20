import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export interface CategoryDoc extends mongoose.Document {
  name: string;
  slug: string;
  image: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export const Category = mongoose.model<CategoryDoc>('Category', categorySchema);