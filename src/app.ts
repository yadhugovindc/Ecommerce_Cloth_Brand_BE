import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import path from 'path';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import stripeRoutes from './routes/stripe';
import { ApiError } from './utils/errors';

const app = express();

const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

// Stripe signs the exact raw request body; this route must precede express.json().
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeRoutes);

app.use(
  cors({
    origin: clientOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Serve uploaded images (admin uploads land in ./uploads)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'atelier-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('❌ Server error:', err);
  }
  res.status(status).json({ message: err.message || 'Something went wrong' });
});

export default app;