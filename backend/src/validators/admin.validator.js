import { z } from 'zod';

const optionalText = (max = 4000) => z.string().trim().max(max).optional();
const nonNegativePrice = z.coerce.number().finite().min(0);
const stock = z.coerce.number().int().min(0);
const optionGroupSchema = z.object({
  groupName: z.string().trim().min(1).max(120),
  maxChoose: z.coerce.number().int().positive(),
  required: z.boolean().default(false),
  items: z.array(z.object({
    optionName: z.string().trim().min(1).max(120),
    extraCost: nonNegativePrice.default(0),
  }).strict()).min(1).max(30),
}).strict().refine((group) => group.maxChoose <= group.items.length, { path: ['maxChoose'], message: 'maxChoose cannot exceed the option count' });

const bookFieldsSchema = z.object({
  title: z.string().trim().min(1).max(255),
  author: z.string().trim().min(1).max(180).optional(),
  brand: z.string().trim().max(120).optional().default(''),
  specifications: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullable().optional(),
  optionGroups: z.array(optionGroupSchema).max(20).optional(),
  description: optionalText().nullable(),
  price: nonNegativePrice,
  discountPrice: nonNegativePrice.optional().nullable(),
  stock,
  image: z.string().trim().max(2048).optional().nullable(),
  categoryId: z.string().min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export const bookCreateSchema = bookFieldsSchema.refine(
  (data) => data.discountPrice == null || data.discountPrice === 0 || data.discountPrice < data.price,
  { path: ['discountPrice'], message: 'Discount price must be lower than the regular price' },
);
export const bookUpdateSchema = bookFieldsSchema.partial()
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')
  .refine((data) => data.discountPrice == null || data.discountPrice === 0 || data.price === undefined || data.discountPrice < data.price,
    { path: ['discountPrice'], message: 'Discount price must be lower than the regular price' });

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: optionalText(1000).nullable(),
  image: z.string().trim().max(2048).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export const categoryUpdateSchema = categoryCreateSchema.partial().refine((data) => Object.keys(data).length > 0, 'At least one field is required');

export const orderStatusSchema = z.object({
  orderStatus: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED']),
});

const promotionFieldsSchema = z.object({
  code: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(160),
  description: optionalText(1000),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.coerce.number().finite().positive(),
  minOrderAmount: nonNegativePrice.optional().default(0),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  usageLimit: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export const promotionCreateSchema = promotionFieldsSchema
  .refine((data) => data.endsAt > data.startsAt, { path: ['endsAt'], message: 'End date must be after start date' })
  .refine((data) => data.discountType !== 'PERCENTAGE' || data.discountValue <= 100, { path: ['discountValue'], message: 'Percentage cannot exceed 100' });
export const promotionUpdateSchema = promotionFieldsSchema.partial()
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')
  .refine((data) => data.startsAt === undefined || data.endsAt === undefined || data.endsAt > data.startsAt,
    { path: ['endsAt'], message: 'End date must be after start date' })
  .refine((data) => data.discountType !== 'PERCENTAGE' || data.discountValue === undefined || data.discountValue <= 100,
    { path: ['discountValue'], message: 'Percentage cannot exceed 100' });

export const membershipCreateSchema = z.object({
  level: z.string().trim().min(2).max(32).regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Level must start with a letter and contain only letters, numbers, or underscores').transform((level) => level.toUpperCase()),
  name: z.string().trim().min(1).max(80),
  minPoints: z.preprocess((value) => typeof value === 'string' && !value.trim() ? Number.NaN : value, z.coerce.number().int().min(0)),
  description: optionalText(1000),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export const membershipUpdateSchema = membershipCreateSchema.partial().refine((data) => Object.keys(data).length > 0, 'At least one field is required');

const giftCardFieldsSchema = z.object({
  code: z.string().trim().min(4).max(40).transform((value) => value.toUpperCase()),
  initialValue: z.coerce.number().finite().positive(),
  balance: z.coerce.number().finite().nonnegative().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export const giftCardCreateSchema = giftCardFieldsSchema.refine((data) => data.balance === undefined || data.balance <= data.initialValue,
  { path: ['balance'], message: 'Balance cannot exceed the initial value' });
export const giftCardUpdateSchema = giftCardFieldsSchema.partial()
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required')
  .refine((data) => data.balance === undefined || data.initialValue === undefined || data.balance <= data.initialValue,
    { path: ['balance'], message: 'Balance cannot exceed the initial value' });

export const giftCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: optionalText(1000),
  imageUrl: z.string().trim().max(2048).nullable().optional(),
  pointsCost: z.coerce.number().int().positive(),
  stock: z.coerce.number().int().nonnegative(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export const giftUpdateSchema = giftCreateSchema.partial()
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required');
