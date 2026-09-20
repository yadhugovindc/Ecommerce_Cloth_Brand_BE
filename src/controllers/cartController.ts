import { Response } from 'express';
import * as cartService from '../services/cartService';
import { AuthRequest } from '../middleware/auth';

export async function get(req: AuthRequest, res: Response) {
  const cart = await cartService.getCart(req.user!.id);
  res.json({ cart });
}

export async function add(req: AuthRequest, res: Response) {
  const cart = await cartService.addItem(req.user!.id, req.body || {});
  res.json({ cart });
}

export async function merge(req: AuthRequest, res: Response) {
  const cart = await cartService.mergeItems(req.user!.id, req.body?.items);
  res.json({ cart });
}

export async function update(req: AuthRequest, res: Response) {
  const cart = await cartService.updateItem(req.user!.id, req.body || {});
  res.json({ cart });
}

export async function remove(req: AuthRequest, res: Response) {
  const cart = await cartService.removeItem(req.user!.id, req.body || {});
  res.json({ cart });
}