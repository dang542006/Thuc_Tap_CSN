import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookForm, buildBookPayload } from './adminBookForm.js';

const book = { title: 'Sản phẩm', brand: 'Hãng', categoryId: 'one', price: '800000', discountPrice: null, stock: 12, description: null, specifications: null, status: 'ACTIVE' };
test('stock edit sends exactly 4 and does not overwrite other fields', () => {
  assert.deepEqual(buildBookPayload({ ...createBookForm(book), stock: '4' }, book), { stock: 4 });
});
test('prices accept VND grouping and discount can be cleared to null', () => {
  assert.deepEqual(buildBookPayload({ ...createBookForm(book), price: '900.000', discountPrice: '700000' }, book), { price: 900000, discountPrice: 700000 });
  const discounted = { ...book, discountPrice: '600000' };
  assert.deepEqual(buildBookPayload({ ...createBookForm(discounted), discountPrice: '' }, discounted), { discountPrice: null });
});
test('all text, category, status and multiline fields preserve intended changes', () => {
  const changed = { title: 'Tên mới', brand: 'Hãng mới', categoryId: 'two', description: 'Dòng 1\nDòng 2', status: 'INACTIVE' };
  assert.deepEqual(buildBookPayload({ ...createBookForm(book), ...changed }, book), changed);
  assert.deepEqual(buildBookPayload(createBookForm(book), book), {});
});
test('technical specifications are parsed as an object and invalid JSON is rejected', () => {
  assert.deepEqual(buildBookPayload({ ...createBookForm(book), specifications: '{"RAM":"16GB"}' }, book), { specifications: { RAM: '16GB' } });
  assert.throws(() => buildBookPayload({ ...createBookForm(book), specifications: 'not-json' }, book), /JSON/);
});
test('invalid numbers and discounts are rejected without silent coercion', () => {
  for (const stock of ['', '-1', '1.5', 'abc']) assert.throws(() => buildBookPayload({ ...createBookForm(book), stock }, book));
  for (const price of ['', '-10', 'abc']) assert.throws(() => buildBookPayload({ ...createBookForm(book), price }, book));
  assert.throws(() => buildBookPayload({ ...createBookForm(book), discountPrice: '900000' }, book));
});
