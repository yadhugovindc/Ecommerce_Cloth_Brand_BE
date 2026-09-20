import { Response } from 'express';
import * as productService from '../services/productService';
import { AuthRequest } from '../middleware/auth';

export async function list(req: AuthRequest, res: Response) {
  const result = await productService.listProducts(
    req.query as Record<string, string>
  );
  res.json(result);
}

export async function listFeatured(_req: AuthRequest, res: Response) {
  const products = await productService.listFeatured();
  res.json({ products });
}

export async function getBySlug(req: AuthRequest, res: Response) {
  const product = await productService.getProductBySlug(req.params.slug);
  res.json({ product });
}

export async function create(req: AuthRequest, res: Response) {
  const product = await productService.createProduct(req.body || {});
  res.status(201).json({ product });
}

export async function update(req: AuthRequest, res: Response) {
  const product = await productService.updateProduct(req.params.id, req.body || {});
  res.json({ product });
}

export async function remove(req: AuthRequest, res: Response) {
  await productService.deleteProduct(req.params.id);
  res.json({ message: 'Product deleted' });
}