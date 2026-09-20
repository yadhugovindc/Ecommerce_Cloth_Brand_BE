import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { createError } from '../utils/errors';
import { signToken } from '../utils/auth';

type UserLike = {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  email: string;
  role: string;
};

export function sanitizeUser(user: UserLike) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function register(name: string, email: string, password: string) {
  if (!name || !email || !password) {
    throw createError('Name, email and password are required');
  }
  if (password.length < 6) {
    throw createError('Password must be at least 6 characters');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw createError('An account with this email already exists', 409);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, role: 'customer' });

  return { token: signToken(user.id), user: sanitizeUser(user) };
}

export async function login(email: string, password: string) {
  if (!email || !password) {
    throw createError('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw createError('Invalid email or password', 401);
  }

  return { token: signToken(user.id), user: sanitizeUser(user) };
}

export async function getUserById(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404);
  return sanitizeUser(user);
}