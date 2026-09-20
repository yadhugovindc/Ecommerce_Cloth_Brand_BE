import { Response } from 'express';
import * as categoryService from '../services/categoryService';
import { AuthRequest } from '../middleware/auth';

export async function list(_req: AuthRequest, res: Response) {
  const categories = await categoryService.listCategories();
  res.json({ categories });
}

export async function create(req: AuthRequest, res: Response) {
  const category = await categoryService.createCategory(req.body || {});
  res.status(201).json({ category });
}

export async function update(req: AuthRequest, res: Response) {
  const category = await categoryService.updateCategory(req.params.id, req.body || {});
  res.json({ category });
}

export async function remove(req: AuthRequest, res: Response) {
  await categoryService.deleteCategory(req.params.id);
  res.json({ message: 'Category deleted' });
}