import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await readFile(resolve(root, 'docs/product-image-sources.json'), 'utf8'));
const manifestBySlug = new Map(manifest.map((item) => [item.slug, item]));
const api = 'http://localhost:5000/api';

async function getJson(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200, `GET ${url} must return 200`);
  return response.json();
}

const categories = (await getJson(`${api}/categories`)).data;
const result = await getJson(`${api}/books?limit=48`);
const products = result.data.items;
assert.equal(result.data.total, products.length);
assert.equal(products.length, manifest.length, 'Every live product needs one image manifest entry');
const categoryCounts = {};
for (const slug of ['laptop', 'laptop-gaming', 'laptop-van-phong-hoc-tap', 'cpu', 'gpu', 'ram', 'o-luu-tru', 'mainboard', 'nguon-may-tinh', 'tan-nhiet-cpu']) {
  const filtered = await getJson(`${api}/books?categorySlug=${encodeURIComponent(slug)}&limit=48`);
  categoryCounts[slug] = filtered.data.total;
}
assert.equal(categoryCounts.laptop, 9); // includes pre-existing active product "aa", which has no mapped image
assert.equal(categoryCounts['laptop-gaming'], 2);
assert.equal(categoryCounts['laptop-van-phong-hoc-tap'], 6);
for (const slug of ['cpu', 'gpu', 'mainboard', 'ram', 'o-luu-tru', 'nguon-may-tinh', 'tan-nhiet-cpu', 'case', 'quat-case']) {
  const filtered = await getJson(`${api}/books?categorySlug=${encodeURIComponent(slug)}&limit=48`);
  categoryCounts[slug] = filtered.data.total;
}
assert.equal((await getJson(`${api}/books?q=ThinkPad&limit=48`)).data.total, 1);

const hashes = new Set();
const productsMissingImages = [];
for (const product of products) {
  const record = manifestBySlug.get(product.slug);
  assert.ok(record, `Missing image manifest row for ${product.slug}`);
  if (!record.imageFile) {
    assert.equal(product.image, null, `Missing-image manifest row must match null image for ${product.slug}`);
    productsMissingImages.push(product.slug);
    continue;
  }
  assert.equal(product.image, `/uploads/catalog/${record.imageFile}`, `Database image must match manifest for ${product.slug}`);
  const response = await fetch(`http://localhost:5000${product.image}`);
  assert.equal(response.status, 200, `Image must load for ${product.slug}`);
  assert.match(response.headers.get('content-type') || '', /^image\//, `Image response type must be valid for ${product.slug}`);
  const hash = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  assert.ok(!hashes.has(hash), `Image bytes are reused by another product: ${product.slug}`);
  hashes.add(hash);
}

const kinds = Object.fromEntries(manifest.reduce((counts, item) => counts.set(item.kind, (counts.get(item.kind) || 0) + 1), new Map()));
console.log(JSON.stringify({ products: products.length, categories: categories.length, categoryCounts, uniqueServedImages: hashes.size, productsMissingImages, imageKinds: kinds }));
