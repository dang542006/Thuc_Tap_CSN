import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema } from '../src/validators/auth.validator.js';
import { addressCreateSchema, addressUpdateSchema, cartAddSchema, checkoutSchema, profileSchema, reviewSchema } from '../src/validators/customer.validator.js';
import { bookCreateSchema, membershipCreateSchema, membershipUpdateSchema, promotionCreateSchema } from '../src/validators/admin.validator.js';
import { ORDER_TRANSITIONS } from '../src/constants/commerce.js';
import { newsletterSubscribeSchema } from '../src/validators/newsletter.validator.js';
import { validate } from '../src/middlewares/validate.js';

test('registration rejects role injection and malformed identities', () => {
  assert.equal(registerSchema.safeParse({ name: 'Test User', email: 'test@example.com', password: 'long-enough-password', role: 'ADMIN' }).success, false);
  assert.equal(registerSchema.safeParse({ name: 'Test User', email: 'invalid', password: 'long-enough-password' }).success, false);
  assert.equal(registerSchema.safeParse({ name: 'Test User', email: 'test@example.com', password: 'é'.repeat(40) }).success, false);
});

test('reviews only accept integer ratings from one through five', () => {
  for (const rating of [0, 6, 2.5, 'invalid']) {
    assert.equal(reviewSchema.safeParse({ bookId: 'book-id', rating }).success, false);
  }
  assert.equal(reviewSchema.safeParse({ bookId: 'book-id', rating: '5', comment: 'Good' }).success, true);
});

test('book discounts cannot exceed the regular price', () => {
  const base = { title: 'Laptop', brand: 'Lenovo', specifications: { CPU: 'Core Ultra 5', RAM: '16GB' }, price: 100, stock: 3, categoryId: 'category-id' };
  assert.equal(bookCreateSchema.safeParse({ ...base, discountPrice: 101 }).success, false);
  assert.equal(bookCreateSchema.safeParse({ ...base, discountPrice: 80 }).success, true);
  assert.equal(bookCreateSchema.safeParse({ ...base, optionGroups: [{ groupName: 'RAM', maxChoose: 1, required: true, items: [{ optionName: '16GB', extraCost: 0 }] }] }).success, true);
  assert.equal(bookCreateSchema.safeParse({ ...base, optionGroups: [{ groupName: 'RAM', maxChoose: 2, required: true, items: [{ optionName: '16GB', extraCost: -1 }] }] }).success, false);
});

test('checkout requires a valid receiver phone and permits only COD or VNPAY', () => {
  const base = { receiverName: 'Test User', shippingAddress: '123 Example Street', receiverPhone: '090 123 4567', paymentMethod: 'VNPAY' };
  assert.equal(checkoutSchema.safeParse(base).success, true);
  assert.equal(checkoutSchema.safeParse({ ...base, receiverPhone: 'call me' }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...base, paymentMethod: 'CARD' }).success, false);
});

test('saved delivery addresses validate required recipient fields and reject extra data', () => {
  const address = { receiverName: 'Test User', phoneNumber: '090 123 4567', fullAddress: '123 Example Street', addressType: 'HOME', defaultAddress: true };
  assert.equal(addressCreateSchema.safeParse(address).success, true);
  assert.equal(addressCreateSchema.safeParse({ ...address, phoneNumber: 'call me' }).success, false);
  assert.equal(addressCreateSchema.safeParse({ ...address, role: 'ADMIN' }).success, false);
  assert.equal(addressUpdateSchema.safeParse({ defaultAddress: true }).success, true);
  assert.equal(addressUpdateSchema.safeParse({}).success, false);
});

test('cart configuration accepts selected product options and rejects unknown payload fields', () => {
  assert.equal(cartAddSchema.safeParse({ bookId: 'product-id', quantity: 2, selectedOptions: [{ groupId: 'ram', optionItemIds: ['ram-32'] }] }).success, true);
  assert.equal(cartAddSchema.safeParse({ bookId: 'product-id', selectedOptions: [{ groupId: 'ram', optionItemIds: ['ram-32'] }], role: 'ADMIN' }).success, false);
});

test('profile updates accept email and normalize it', () => {
  assert.deepEqual(profileSchema.parse({ email: 'USER@EXAMPLE.COM' }), { email: 'user@example.com' });
  assert.equal(profileSchema.safeParse({ email: 'not-an-email' }).success, false);
});

test('promotions reject invalid percentages and inverted date ranges', () => {
  const base = {
    code: 'SAVE10', name: 'Save', discountType: 'PERCENTAGE', discountValue: 10,
    startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2026-10-31T00:00:00.000Z',
  };
  assert.equal(promotionCreateSchema.safeParse({ ...base, discountValue: 101 }).success, false);
  assert.equal(promotionCreateSchema.safeParse({ ...base, endsAt: '2026-09-30T00:00:00.000Z' }).success, false);
  assert.equal(promotionCreateSchema.safeParse(base).success, true);
});

test('membership tiers accept dynamic level codes and validate editable fields', () => {
  const tier = { level: 'diamond_plus', name: 'Kim cương+', minPoints: '2500', description: 'Ưu đãi đặc biệt' };
  assert.deepEqual(membershipCreateSchema.parse(tier), { ...tier, level: 'DIAMOND_PLUS', minPoints: 2500 });
  assert.equal(membershipCreateSchema.safeParse({ ...tier, level: 'DIAMOND-PLUS' }).success, false);
  assert.equal(membershipCreateSchema.safeParse({ ...tier, minPoints: -1 }).success, false);
  assert.equal(membershipCreateSchema.safeParse({ ...tier, minPoints: '' }).success, false);
  assert.equal(membershipUpdateSchema.safeParse({ status: 'ACTIVE' }).success, true);
  assert.equal(membershipUpdateSchema.safeParse({}).success, false);
});

test('membership validation errors identify the invalid fields for the admin form', () => {
  let validationError;
  validate(membershipCreateSchema, 'body')({ body: { level: 'BAD-LEVEL', name: '', minPoints: -1 } }, {}, (error) => { validationError = error; });
  assert.equal(validationError.statusCode, 422);
  assert.match(validationError.message, /level:/);
  assert.match(validationError.message, /name:/);
});

test('order state transitions do not allow delivery before shipping or reopening cancelled orders', () => {
  assert.equal(ORDER_TRANSITIONS.PENDING.includes('DELIVERED'), false);
  assert.deepEqual(ORDER_TRANSITIONS.CANCELLED, []);
  assert.equal(ORDER_TRANSITIONS.SHIPPING.includes('DELIVERED'), true);
});

test('newsletter signup requires a valid email and rejects extra fields', () => {
  assert.equal(newsletterSubscribeSchema.safeParse({ email: 'reader@example.com' }).success, true);
  assert.equal(newsletterSubscribeSchema.safeParse({ email: 'invalid' }).success, false);
  assert.equal(newsletterSubscribeSchema.safeParse({ email: 'reader@example.com', role: 'ADMIN' }).success, false);
});
