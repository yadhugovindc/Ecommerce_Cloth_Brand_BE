import multer from 'multer';
import { createError } from '../utils/errors';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(createError('Only image files are allowed', 400) as unknown as Error);
      return;
    }
    cb(null, true);
  },
});