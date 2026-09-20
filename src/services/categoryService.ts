import { Category } from '../models/Category';
import { createError } from '../utils/errors';
import slugify from '../utils/slugify';

export async function listCategories() {
  return Category.find().sort({ name: 1 });
}

export async function createCategory(data: Record<string, unknown>) {
  const payload = { ...data };
  if (!payload.slug && payload.name) payload.slug = slugify(String(payload.name));
  return Category.create(payload);
}

export async function updateCategory(id: string, data: Record<string, unknown>) {
  const payload = { ...data };
  if (payload.name && !payload.slug) payload.slug = slugify(String(payload.name));
  const category = await Category.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!category) throw createError('Category not found', 404);
  return category;
}

export async function deleteCategory(id: string) {
  const category = await Category.findByIdAndDelete(id);
  if (!category) throw createError('Category not found', 404);
}