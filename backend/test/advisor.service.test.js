import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdvisorService, createOpenAIResponder } from '../src/services/advisor.service.js';
import { advisorSchema } from '../src/validators/advisor.validator.js';

const products = [
  { id: 'lap-office', slug: 'office-14', title: 'Lenovo ThinkPad E14 Gen 6', brand: 'Lenovo', author: 'Lenovo', image: '/e14.jpg', price: 21990000, discountPrice: null, stock: 4, category: { name: 'Laptop văn phòng', slug: 'laptop-van-phong' }, specifications: { CPU: 'Intel Core Ultra 5 125U', RAM: '16GB DDR5', SSD: '512GB NVMe' } },
  { id: 'lap-game', slug: 'tuf-a15', title: 'ASUS TUF Gaming A15 RTX 4060', brand: 'ASUS', author: 'ASUS', image: '/tuf.jpg', price: 28990000, discountPrice: null, stock: 2, category: { name: 'Laptop gaming', slug: 'laptop-gaming' }, specifications: { CPU: 'Ryzen 7 7735HS', RAM: '16GB DDR5', graphics: 'GeForce RTX 4060 8GB' } },
  { id: 'ssd', slug: 'sn580', title: 'WD Blue SN580 1TB NVMe SSD', brand: 'Western Digital', author: 'Western Digital', image: '/sn580.jpg', price: 1890000, discountPrice: null, stock: 9, category: { name: 'SSD/HDD', slug: 'o-luu-tru' }, specifications: { capacity: '1TB', interface: 'PCIe 4.0 x4 NVMe', formFactor: 'M.2 2280' } },
];
const repository = { findCandidates: async () => products };
const config = { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'mock', ADVISOR_TIMEOUT_MS: 50 };

test('natural language budget and gaming intent restrict model candidates to matching catalog products', async () => {
  let seen;
  const service = createAdvisorService({ repository, configuration: config, callModel: async (_messages, candidates) => { seen = candidates; return { message: 'Đề xuất phù hợp.', picks: [{ id: 'lap-game', reason: 'Có GPU rời được liệt kê.', limitation: 'Chưa có dữ liệu độ phân giải/game cụ thể.' }] }; } });
  const result = await service.reply(['Tìm laptop gaming dưới 30 triệu để chơi game']);
  assert.deepEqual(seen.map((product) => product.id), ['lap-game']);
  assert.equal(result.mode, 'ai');
  assert.equal(result.recommendations[0].product.price, 28990000);
});

test('formatted Vietnamese VND budgets are parsed and applied before model calls', async () => {
  let seen;
  const service = createAdvisorService({ repository, configuration: config, callModel: async (_messages, candidates) => { seen = candidates; return { message: 'Hợp ngân sách.', picks: [{ id: 'lap-office', reason: 'Nằm trong khoảng đã lọc.', limitation: 'Giá demo.' }] }; } });
  const result = await service.reply(['Laptop văn phòng, tầm 20.000.000 VNĐ']);
  assert.deepEqual(seen.map(({ id }) => id), ['lap-office']);
  assert.equal(result.recommendations[0].product.price, 21990000);
});

test('rule mode works without an API key and labels the result accurately', async () => {
  const service = createAdvisorService({ repository, configuration: { OPENAI_API_KEY: '', ADVISOR_TIMEOUT_MS: 50 } });
  const result = await service.reply(['SSD dưới 3 triệu']);
  assert.equal(result.mode, 'rules');
  assert.equal(result.aiStatus, 'not_configured');
  assert.deepEqual(result.recommendations.map(({ product }) => product.id), ['ssd']);
});

test('model cannot invent product ids or replace database prices', async () => {
  const service = createAdvisorService({ repository, configuration: config, callModel: async () => ({ message: 'Try these', picks: [{ id: 'fabricated', reason: 'Fits', limitation: 'Unknown', price: 1 }] }) });
  const result = await service.reply(['Tư vấn laptop']);
  assert.equal(result.mode, 'rules_fallback');
  assert.equal(result.aiStatus, 'invalid_response');
  assert.ok(result.recommendations.every(({ product }) => products.some((candidate) => candidate.id === product.id && candidate.price === product.price)));
  const alteredPrice = createAdvisorService({ repository, configuration: config, callModel: async () => ({ message: 'Laptop này phù hợp.', picks: [{ id: 'lap-game', reason: 'Có GPU rời.', limitation: 'Chưa có kiểm thử game.', price: 1 }] }) });
  const trusted = await alteredPrice.reply(['Laptop gaming']);
  assert.equal(trusted.recommendations[0].product.price, 28990000);
});

test('no matching category returns an empty result without calling the model', async () => {
  let called = false;
  const service = createAdvisorService({ repository, configuration: config, callModel: async () => { called = true; throw new Error('should not call'); } });
  const result = await service.reply(['Tìm bàn phím cơ dưới 500 nghìn']);
  assert.equal(result.recommendations.length, 0);
  assert.equal(called, false);
});

test('advisor input schema rejects blank, oversized, and overlong history payloads', () => {
  assert.equal(advisorSchema.safeParse({ messages: ['   '] }).success, false);
  assert.equal(advisorSchema.safeParse({ messages: ['a'.repeat(501)] }).success, false);
  assert.equal(advisorSchema.safeParse({ messages: Array(9).fill('Laptop') }).success, false);
  assert.equal(advisorSchema.safeParse({ messages: ['Laptop gaming'] }).success, true);
});

test('model timeout and service failure fall back to database-backed rules', async () => {
  const timeout = createAdvisorService({ repository, configuration: config, callModel: async (_messages, _items, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))) ) });
  const timed = await timeout.reply(['Laptop văn phòng tầm 20 triệu']);
  assert.equal(timed.aiStatus, 'timeout');
  assert.ok(timed.recommendations.every(({ product }) => products.some(({ id }) => id === product.id)));
  const unavailable = createAdvisorService({ repository, configuration: config, callModel: async () => { throw new Error('network'); } });
  assert.equal((await unavailable.reply(['Laptop văn phòng'])).aiStatus, 'unavailable');
  const quota = createAdvisorService({ repository, configuration: config, callModel: async () => { throw new Error('openai_http_429'); } });
  assert.equal((await quota.reply(['Laptop văn phòng'])).aiStatus, 'quota_or_rate_limited');
});

test('Responses API mock receives only shortlisted catalog items and returned IDs resolve to database products', async () => {
  let request;
  const responder = createOpenAIResponder({ OPENAI_API_KEY: 'mock-secret', OPENAI_MODEL: 'mock-model' }, async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ message: 'Phù hợp với nhu cầu.', items: [{ id: 'lap-game', reason: 'GPU rời có trong thông số.', limitation: 'Chưa có benchmark theo game.' }] }) }] }] }) };
  });
  const service = createAdvisorService({ repository, configuration: config, callModel: responder });
  const result = await service.reply(['Laptop gaming dưới 30 triệu']);
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.options.headers.Authorization, 'Bearer mock-secret');
  const sent = JSON.parse(request.body.input[0].content);
  assert.deepEqual(sent.candidates.map((item) => item.id), ['lap-game']);
  assert.equal(result.recommendations[0].product.title, products[1].title);
  assert.equal(result.recommendations[0].product.price, products[1].price);
});

test('malformed Responses API output is rejected and returns a labeled rule fallback', async () => {
  const responder = createOpenAIResponder(config, async () => ({ ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: '{bad json' }] }] }) }));
  const service = createAdvisorService({ repository, configuration: config, callModel: responder });
  const result = await service.reply(['Laptop gaming']);
  assert.equal(result.aiStatus, 'invalid_response');
  assert.equal(result.mode, 'rules_fallback');
});
