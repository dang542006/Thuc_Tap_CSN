import { z } from 'zod';

const passwordSchema = z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes');

export const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: passwordSchema,
  name: z.string().trim().min(2).max(120),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes'),
}).strict();
