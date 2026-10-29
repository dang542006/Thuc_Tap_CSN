import test from 'node:test';
import assert from 'node:assert/strict';
import { getBuildCompatibility } from '../src/utils/pcCompatibility.js';
import { createPcBuilderService } from '../src/services/pcBuilder.service.js';

const specs = {
  cpu: { socket: 'AM5', supportedChipsets: ['B650'], minimumBiosVersion: '1.00', defaultTDP: '65W' },
  motherboard: { socket: 'AM5', chipset: 'B650', biosVersion: '1.00', memory: 'DDR5, 4 khe DIMM', memorySlots: 4, maxMemoryGB: 128, cpuPowerConnectors: ['8-pin EPS'], formFactor: 'Micro-ATX', storage: '2 khe M.2 PCIe 4.0, SATA' },
  ram: { type: 'DDR5', formFactor: 'DIMM', capacity: '32GB', capacityGB: 32, moduleCount: 2 },
  gpu: { powerDraw: '170W', lengthMm: 250, powerConnector: '8-pin' },
  storage: { formFactor: 'M.2 2280', interface: 'PCIe 4.0 x4 NVMe' },
  psu: { power: '650W', formFactor: 'ATX', pcieConnectors: ['8-pin'], cpuConnectors: ['8-pin EPS'] },
  cooler: { compatibleSockets: ['AM5'], height: '155mm', maxTdpW: 220 },
  case: { supportedMotherboards: ['Micro-ATX'], psuFormFactor: 'ATX', fanSupport: ['120 mm', '140 mm'], maxGpuLengthMm: 300, maxCoolerHeightMm: 160, radiatorSupport: [120, 240] },
};

function completeParts(overrides = {}) {
  return Object.fromEntries(Object.keys(specs).map((slot) => [slot, {
    id: slot, slug: slot, title: slot, stock: 3, price: 1000,
    specifications: { ...specs[slot], ...(overrides[slot] || {}) },
  }]));
}

test('PC compatibility is verified only when socket, memory, drive, power, connector and clearance data match', () => {
  const result = getBuildCompatibility(completeParts());
  assert.equal(result.status, 'compatible');
  assert.equal(result.verifiedCompatible, true);
  assert.ok(result.checks.every((check) => check.status === 'COMPATIBLE'));
});

test('PC compatibility reports CPU socket and RAM generation conflicts from catalog specs', () => {
  const result = getBuildCompatibility(completeParts({ motherboard: { socket: 'LGA1700', memory: 'DDR4, 4 khe DIMM' } }));
  assert.equal(result.status, 'incompatible');
  assert.equal(result.checks.find((check) => check.key === 'cpu-socket').status, 'INCOMPATIBLE');
  assert.equal(result.checks.find((check) => check.key === 'ram-generation').status, 'INCOMPATIBLE');
});

test('missing dimensions and power data are reported as unverified, never as compatible', () => {
  const result = getBuildCompatibility(completeParts({ gpu: { powerDraw: undefined, lengthMm: undefined, powerConnector: undefined }, case: { maxGpuLengthMm: undefined, maxCoolerHeightMm: undefined }, psu: { pcieConnectors: undefined } }));
  assert.equal(result.status, 'unverified');
  assert.equal(result.verifiedCompatible, false);
  assert.ok(result.checks.filter((check) => ['gpu-clearance', 'power-budget', 'gpu-power-connector'].includes(check.key)).every((check) => check.status === 'UNKNOWN'));
});

const slotSlugs = { cpu: 'cpu', motherboard: 'mainboard', ram: 'ram', gpu: 'gpu', storage: 'o-luu-tru', psu: 'nguon-may-tinh', cooler: 'tan-nhiet-cpu', case: 'case', fan: 'quat-case' };
function createRepository(productsBySlot) {
  const categories = Object.entries(slotSlugs).map(([slot, slug]) => ({
    id: `category-${slot}`, slug, name: slot,
    books: (productsBySlot[slot] || []).map((item) => ({ ...item, categoryId: `category-${slot}` })),
  }));
  const byId = new Map(categories.flatMap((category) => category.books.map((item) => [item.id, { ...item, category: { id: category.id, name: category.name, slug: category.slug } }])));
  return {
    findCatalog: async () => categories,
    findBooksByIds: async (ids) => ids.map((id) => byId.get(id)).filter(Boolean),
  };
}

const product = (slot, id, specifications, price = 1000) => ({ id, slug: id, title: id, brand: 'Test', author: 'Test', image: `/images/${id}.jpg`, price, discountPrice: null, stock: 4, specifications });

test('builder catalog is based on database categories and empty case category remains explicit', async () => {
  const service = createPcBuilderService({ repository: createRepository({ cpu: [product('cpu', 'cpu-1', { socket: 'AM5' })] }), configuration: { OPENAI_API_KEY: '' } });
  const catalog = await service.catalog();
  assert.equal(catalog.slots.cpu.products[0].id, 'cpu-1');
  assert.deepEqual(catalog.slots.case.products, []);
  assert.equal(catalog.catalogStatus, 'incomplete');
});

test('builder check computes database price and rejects a product selected in the wrong slot', async () => {
  const cpu = product('cpu', 'cpu-1', { socket: 'AM5' }, 4000);
  const service = createPcBuilderService({ repository: createRepository({ cpu: [cpu] }), configuration: { OPENAI_API_KEY: '' } });
  const valid = await service.check({ cpu: 'cpu-1' });
  assert.equal(valid.totalPrice, 4000);
  assert.equal(valid.compatibility.status, 'incomplete');
  await assert.rejects(() => service.check({ motherboard: 'cpu-1' }), { code: 'BUILDER_CATEGORY_MISMATCH' });
});

test('builder refuses to price an out-of-stock selected part', async () => {
  const cpu = { ...product('cpu', 'cpu-empty', { socket: 'AM5' }, 1000), stock: 0 };
  const service = createPcBuilderService({ repository: createRepository({ cpu: [cpu] }), configuration: { OPENAI_API_KEY: '' } });
  await assert.rejects(() => service.check({ cpu: 'cpu-empty' }), { code: 'BUILDER_PRODUCT_UNAVAILABLE' });
});

test('builder exposes fan catalog, includes selected fan in backend total, and checks its case mount', async () => {
  const fan = product('fan', 'fan-120', { sizeMM: 120 }, 500);
  const pcCase = product('case', 'case-1', { supportedMotherboards: ['Micro-ATX'], fanSupport: ['120 mm'] }, 1000);
  const service = createPcBuilderService({ repository: createRepository({ fan: [fan], case: [pcCase] }), configuration: { OPENAI_API_KEY: '' } });
  const catalog = await service.catalog();
  assert.equal(catalog.slots.fan.products[0].id, 'fan-120');
  const result = await service.check({ fan: 'fan-120', case: 'case-1' });
  assert.equal(result.totalPrice, 1500);
  assert.equal(result.compatibility.checks.find((item) => item.key === 'fan-mount').status, 'COMPATIBLE');
});

test('compatibility emits UNKNOWN when mainboard CPU power connector data is missing', () => {
  const result = getBuildCompatibility(completeParts({ motherboard: { cpuPowerConnectors: undefined } }));
  assert.equal(result.checks.find((item) => item.key === 'cpu-power-connector').status, 'UNKNOWN');
});

test('compatibility rejects a RAM kit that exceeds board slots and a GPU that exceeds case clearance', () => {
  const result = getBuildCompatibility(completeParts({
    ram: { moduleCount: 5 },
    gpu: { lengthMm: 350 },
  }));
  assert.equal(result.checks.find((item) => item.key === 'ram-slots').status, 'INCOMPATIBLE');
  assert.equal(result.checks.find((item) => item.key === 'gpu-clearance').status, 'INCOMPATIBLE');
});

test('compatibility requires enough matching GPU power plugs and checks case PSU form factor', () => {
  const result = getBuildCompatibility(completeParts({
    gpu: { powerConnector: '2x 8-pin' },
    psu: { pcieConnectors: ['1x 6+2-pin'] },
    case: { psuFormFactor: 'SFX' },
  }));
  assert.equal(result.checks.find((item) => item.key === 'gpu-power-connector').status, 'INCOMPATIBLE');
  assert.equal(result.checks.find((item) => item.key === 'case-psu-form-factor').status, 'INCOMPATIBLE');
});

test('compatibility rejects a cooler with the wrong socket and an undersized PSU budget', () => {
  const result = getBuildCompatibility(completeParts({
    cooler: { compatibleSockets: ['LGA1700'] },
    psu: { power: '300W' },
  }));
  assert.equal(result.checks.find((item) => item.key === 'cooler-socket').status, 'INCOMPATIBLE');
  assert.equal(result.checks.find((item) => item.key === 'power-budget').status, 'INCOMPATIBLE');
});

test('compatibility checks AIO radiator mounting against the case data', () => {
  const result = getBuildCompatibility(completeParts({ cooler: { radiatorSizeMM: 360 } }));
  assert.equal(result.checks.find((item) => item.key === 'radiator-clearance').status, 'INCOMPATIBLE');
});

test('PC build advisor does not invoke AI or invent a complete build when catalog is incomplete', async () => {
  let called = false;
  const service = createPcBuilderService({
    repository: createRepository({ cpu: [product('cpu', 'cpu-1', { socket: 'AM5' })] }),
    configuration: { OPENAI_API_KEY: 'test-key' },
    callModel: async () => { called = true; return { message: 'fake', items: [] }; },
  });
  const result = await service.advise({ budget: 20000000, purpose: 'gaming', ownedProductIds: [], notes: '' });
  assert.equal(result.aiStatus, 'catalog_incomplete');
  assert.deepEqual(result.recommendations, []);
  assert.equal(called, false);
});

test('PC build advisor returns an explicit no-key state when no compatible build exists', async () => {
  const service = createPcBuilderService({ repository: createRepository({}), configuration: { OPENAI_API_KEY: '' } });
  const result = await service.advise({ budget: 20000000, ownedProductIds: [], notes: '' });
  assert.equal(result.mode, 'rules');
  assert.equal(result.aiStatus, 'not_configured');
  assert.equal(result.recommendations.length, 0);
});

test('PC build advisor resolves model candidate IDs to database parts and prices', async () => {
  const products = Object.fromEntries(Object.keys(slotSlugs).map((slot) => [slot, [product(slot, `${slot}-1`, specs[slot], 1000)]]));
  let modelInput;
  const service = createPcBuilderService({
    repository: createRepository(products),
    configuration: { OPENAI_API_KEY: 'test-key', ADVISOR_TIMEOUT_MS: 1000 },
    callModel: async ({ builds }) => {
      modelInput = builds;
      return { message: 'Cấu hình đã được backend xác minh.', items: [{ id: builds[0].id, reason: 'Các chuẩn socket và RAM đã khớp.', limitation: 'Giá demo.' }] };
    },
  });
  const result = await service.advise({ budget: 10000, purpose: 'gaming', ownedProductIds: [], notes: '' });
  assert.equal(result.mode, 'ai');
  assert.equal(result.recommendations[0].totalPrice, 8000);
  assert.equal(result.recommendations[0].parts.cpu.id, 'cpu-1');
  assert.equal(modelInput[0].compatibility.verifiedCompatible, true);
});

test('PC build advisor rejects a model candidate that was not produced from the catalog', async () => {
  const products = Object.fromEntries(Object.keys(slotSlugs).map((slot) => [slot, [product(slot, `${slot}-1`, specs[slot], 1000)]]));
  const service = createPcBuilderService({
    repository: createRepository(products),
    configuration: { OPENAI_API_KEY: 'test-key', ADVISOR_TIMEOUT_MS: 1000 },
    callModel: async () => ({ message: 'Bịa cấu hình', items: [{ id: 'fake-build', reason: 'Rẻ', limitation: 'Không rõ' }] }),
  });
  const result = await service.advise({ budget: 10000, purpose: 'gaming', ownedProductIds: [], notes: '' });
  assert.equal(result.mode, 'rules_fallback');
  assert.equal(result.aiStatus, 'invalid_response');
  assert.ok(result.recommendations.every((build) => build.totalPrice === 8000));
});
