import { z } from 'zod';

export const advisorSchema = z.object({
  messages: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
}).strict();
