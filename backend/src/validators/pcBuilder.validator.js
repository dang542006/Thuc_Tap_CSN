import { z } from 'zod';

const productId = z.string().trim().min(1).max(30).nullable().optional();
const selection = z.object({
  cpu: productId,
  motherboard: productId,
  ram: productId,
  gpu: productId,
  storage: productId,
  psu: productId,
  cooler: productId,
  case: productId,
  fan: productId,
}).strict();

export const pcBuildCheckSchema = z.object({ selections: selection }).strict();
export const pcBuildAdviceSchema = z.object({
  budget: z.coerce.number().int().positive().max(10000000000).optional(),
  purpose: z.enum(['gaming', 'office', 'creative', 'development']).optional(),
  ownedProductIds: z.array(z.string().trim().min(1).max(30)).max(9).default([]),
  notes: z.string().trim().max(400).optional().default(''),
}).strict();
