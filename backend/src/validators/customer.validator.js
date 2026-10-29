import { z } from 'zod';

export const cartAddSchema = z.object({
  bookId: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1),
  selectedOptions: z.array(z.object({ groupId: z.string().min(1), optionItemIds: z.array(z.string().min(1)).max(30) }).strict()).max(20).optional().default([]),
}).strict();

export const cartQuantitySchema = z.object({
  quantity: z.coerce.number().int().positive(),
}).strict();

export const checkoutSchema = z.object({
  receiverName: z.string().trim().min(2).max(120),
  shippingAddress: z.string().trim().min(8).max(500),
  receiverPhone: z.string().trim().min(7).max(30).regex(/^\+?[\d\s()\-.]+$/, 'Số điện thoại không hợp lệ'),
  paymentMethod: z.enum(['COD', 'VNPAY']),
  promotionCode: z.string().trim().min(1).max(40).optional(),
}).strict();

export const reviewSchema = z.object({
  bookId: z.string().trim().min(1, 'Vui lòng nhập mã sách hoặc ISBN.').max(280),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(5000).optional().transform((value) => value || undefined),
}).strict();

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().min(7).max(30).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one profile field is required');

const addressFields = {
  receiverName: z.string().trim().min(2).max(120),
  phoneNumber: z.string().trim().min(7).max(30).regex(/^\+?[\d\s()\-.]+$/, 'Số điện thoại không hợp lệ'),
  fullAddress: z.string().trim().min(8).max(500),
  addressType: z.string().trim().min(1).max(40).default('HOME'),
  defaultAddress: z.boolean().optional(),
};
export const addressCreateSchema = z.object(addressFields).strict();
export const addressUpdateSchema = z.object(addressFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one address field is required');

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes'),
  newPassword: z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes'),
}).strict();
