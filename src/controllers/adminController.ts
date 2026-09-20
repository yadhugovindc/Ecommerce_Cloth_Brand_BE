import { Response } from 'express';
import * as adminService from '../services/adminService';
import * as orderService from '../services/orderService';
import * as productService from '../services/productService';
import { uploadImage } from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';

export async function getStats(_req: AuthRequest, res: Response) {
  const data = await adminService.getDashboardStats();
  res.json(data);
}

export async function listOrders(req: AuthRequest, res: Response) {
  const orders = await orderService.listAllOrders(
    (req.query.status as string) || undefined
  );
  res.json({ orders });
}

export async function getOrder(req: AuthRequest, res: Response) {
  const order = await orderService.getOrderById(req.params.id);
  res.json({ order });
}

export async function updateOrderStatus(req: AuthRequest, res: Response) {
  const order = await orderService.updateOrderStatus(req.params.id, req.body || {});
  res.json({ order });
}

export async function listProducts(req: AuthRequest, res: Response) {
  const products = await productService.listAllForAdmin(
    (req.query.search as string) || undefined
  );
  res.json({ products });
}

export async function getProduct(req: AuthRequest, res: Response) {
  const product = await productService.getProductById(req.params.id);
  res.json({ product });
}

export async function upload(req: AuthRequest, res: Response) {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) {
    res.status(400).json({ message: 'No files uploaded' });
    return;
  }
  const urls = await Promise.all(files.map((file) => uploadImage(file.buffer)));
  res.status(201).json({ urls });
}