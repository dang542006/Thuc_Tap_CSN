// Explicit integration check: creates only one temporary book and removes it in finally.
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/admin/books`;
let id;
try {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
  const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER', status: 'ACTIVE' }, select: { id: true } });
  const categories = await prisma.category.findMany({ where: { status: 'ACTIVE' }, take: 2 });
  assert(admin && customer && categories.length === 2, 'Need existing admin, customer and two categories');
  const token = (user) => jwt.sign({}, env.JWT_SECRET, { subject: user.id, expiresIn: '5m' });
  async function request(method, path, body, user = admin) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, json: await response.json() };
  }
  const created = await request('POST', '', { title: `QA edit ${Date.now()}`, author: 'QA', price: 800000, stock: 12, categoryId: categories[0].id, description: null, status: 'INACTIVE' });
  assert.equal(created.status, 201, JSON.stringify(created.json)); id = created.json.data.id;
  async function patch(body) { const result = await request('PATCH', `/${id}`, body); assert.equal(result.status, 200, JSON.stringify(result.json)); return prisma.book.findUniqueOrThrow({ where: { id } }); }
  assert.equal((await patch({ stock: 4 })).stock, 4);
  let row = await patch({ price: 900000, discountPrice: 700000 });
  assert.equal(Number(row.price), 900000); assert.equal(Number(row.discountPrice), 700000); assert.equal(row.stock, 4);
  row = await patch({ title: `QA renamed ${Date.now()}`, author: 'Tác giả mới', categoryId: categories[1].id, description: 'Dòng một\nDòng hai', status: 'ACTIVE' });
  assert.equal(row.author, 'Tác giả mới'); assert.equal(row.categoryId, categories[1].id); assert.equal(row.description, 'Dòng một\nDòng hai'); assert.equal(row.status, 'ACTIVE'); assert.match(row.title, /^QA renamed/);
  assert.equal((await patch({ discountPrice: null })).discountPrice, null);
  assert.equal((await patch({ description: null, status: 'INACTIVE' })).description, null);
  for (const body of [{ stock: -1 }, { stock: 1.5 }, { price: -1 }, { discountPrice: 9999999 }, { title: '' }, { author: '' }, { status: 'WRONG' }]) assert.equal((await request('PATCH', `/${id}`, body)).status, 422);
  assert.notEqual((await request('PATCH', `/${id}`, { categoryId: 'missing' })).status, 200);
  assert.equal((await request('PATCH', `/${id}`, { stock: 8 }, customer)).status, 403);
  assert.equal((await request('PATCH', `/${id}`, { stock: 8 }, null)).status, 401);
  assert.equal((await prisma.book.findUniqueOrThrow({ where: { id } })).stock, 4);
  console.log('PASS: stock=4, prices, null discount, title, author, category, multiline/null description, status, invalid payloads, ADMIN authorization, MySQL persistence.');
} finally {
  if (id) { await prisma.book.delete({ where: { id } }); console.log('Temporary QA book removed.'); }
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
}
