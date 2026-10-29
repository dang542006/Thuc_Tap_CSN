import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  VNPAY_TMN_CODE: z.string().optional().default(''),
  VNPAY_HASH_SECRET: z.string().optional().default(''),
  VNPAY_URL: z.string().url().optional().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNPAY_RETURN_URL: z.string().url().optional().default(''),
  FRONTEND_URL: z.string().url().optional().default('http://localhost:5173'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().optional().default('gpt-4.1-mini'),
  ADVISOR_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(12000),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && value.VNPAY_RETURN_URL && new URL(value.VNPAY_RETURN_URL).protocol !== 'https:') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['VNPAY_RETURN_URL'], message: 'VNPAY_RETURN_URL must use HTTPS in production' });
  }
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = Object.freeze(result.data);
