import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as chatService from '../services/chatService';
import { createError } from '../utils/errors';

export async function send(req: AuthRequest, res: Response) {
  const rawMessages = req.body?.messages;
  if (!Array.isArray(rawMessages)) throw createError('A conversation is required.');

  const messages = rawMessages
    .slice(-10)
    .filter((message): message is { role: 'user' | 'assistant'; content: string } =>
      message !== null &&
      typeof message === 'object' &&
      ((message as { role?: string }).role === 'user' || (message as { role?: string }).role === 'assistant') &&
      typeof (message as { content?: unknown }).content === 'string'
    )
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 1200) }))
    .filter((message) => message.content.length > 0);

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    throw createError('Send a message to start the conversation.');
  }

  const guestCart = Array.isArray(req.body?.guestCart)
    ? req.body.guestCart.slice(0, 50).flatMap((rawItem: unknown) => {
        if (!rawItem || typeof rawItem !== 'object') return [];
        const item = rawItem as Record<string, unknown>;
        if (
          typeof item.name !== 'string' ||
          typeof item.quantity !== 'number' ||
          typeof item.unitPriceINR !== 'number' ||
          !Number.isFinite(item.quantity) ||
          !Number.isFinite(item.unitPriceINR)
        ) return [];
        return [{
          name: item.name.slice(0, 120),
          quantity: Math.max(1, Math.floor(item.quantity)),
          size: typeof item.size === 'string' ? item.size.slice(0, 40) : '',
          color: typeof item.color === 'string' ? item.color.slice(0, 40) : '',
          unitPriceINR: Math.max(0, item.unitPriceINR),
        }];
      })
    : undefined;

  const locale = req.body?.locale === 'ml' ? 'ml' : 'en';
  const result = await chatService.chat(messages, {
    userId: req.user?.id,
    locale,
    guestCart: req.user ? undefined : guestCart,
  });
  res.json(result);
}