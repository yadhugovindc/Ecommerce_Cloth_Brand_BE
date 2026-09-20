import { Response } from 'express';
import * as authService from '../services/authService';
import { setAuthCookie, clearAuthCookie } from '../utils/auth';
import { AuthRequest } from '../middleware/auth';

export async function register(req: AuthRequest, res: Response) {
  const { name, email, password } = req.body || {};
  const { token, user } = await authService.register(name, email, password);
  setAuthCookie(res, token);
  res.status(201).json({ user });
}

export async function login(req: AuthRequest, res: Response) {
  const { email, password } = req.body || {};
  const { token, user } = await authService.login(email, password);
  setAuthCookie(res, token);
  res.json({ user });
}

export function logout(_req: AuthRequest, res: Response) {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await authService.getUserById(req.user!.id);
  res.json({ user });
}