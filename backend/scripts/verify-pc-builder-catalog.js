import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prisma, disconnectDatabase } from '../src/config/database.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uploadDirectory = path.join(root, 'backend/uploads/catalog');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'docs/product-image-sources.json'), 'utf8'));
const requiredByCategory = {
  cpu: ['socket', 'tdpW', 'supportedChipsets'],
  mainboard: ['socket', 'chipset', 'memoryType', 'memorySlots', 'formFactor'],
  gpu: ['vramGB', 'lengthMm', 'powerConnectors'],
  ram: ['memoryType', 'capacityGB', 'moduleCount', 'speedMTs'],
  'o-luu-tru': ['interface', 'formFactor', 'capacityGB'],
  'nguon-may-tinh': ['wattageW', 'formFactor', 'gpuConnectors', 'cpuConnectors'],
  'tan-nhiet-cpu': ['supportedSockets', 'coolerHeightMM'],
  case: ['supportedMotherboardFormats', 'maxGpuLengthMM', 'maxCoolerHeightMM'],
  'quat-case': ['sizeMM'],
};

try {
  const products = await prisma.book.findMany({
    where: { status: 'ACTIVE', category: { slug: { in: Object.keys(requiredByCategory) } } },
    select: { id: true, slug: true, isbn: true, image: true, category: { select: { slug: true } }, specifications: true },
  });
  const categories = await prisma.category.findMany({
    where: { slug: { in: Object.keys(requiredByCategory) } },
    select: { id: true, slug: true, name: true, parentId: true, status: true },
  });
  const countsByCategory = Object.fromEntries(Object.keys(requiredByCategory).map((slug) => [slug, products.filter((product) => product.category.slug === slug).length]));
  const incompleteByCategory = {};
  for (const product of products) {
    const specs = product.specifications && typeof product.specifications === 'object' ? product.specifications : {};
    const missing = requiredByCategory[product.category.slug].filter((key) => specs[key] === undefined || specs[key] === null || specs[key] === '');
    if (missing.length) (incompleteByCategory[product.category.slug] ||= []).push({ slug: product.slug, missing });
  }
  const duplicateSlugs = products.length - new Set(products.map((product) => product.slug)).size;
  const skuProducts = products.filter((product) => product.isbn);
  const duplicateSkus = skuProducts.length - new Set(skuProducts.map((product) => product.isbn)).size;
  const hashes = new Map();
  const missingImages = [];
  const missingManifest = [];
  const manifestBySlug = new Map(manifest.map((item) => [item.slug, item]));
  for (const product of products) {
    const record = manifestBySlug.get(product.slug);
    if (!record) { missingManifest.push(product.slug); continue; }
    const expectedPath = `/uploads/catalog/${record.imageFile}`;
    if (product.image !== expectedPath) missingManifest.push(product.slug);
    try {
      const bytes = await fs.readFile(path.join(uploadDirectory, record.imageFile));
      const hash = createHash('sha256').update(bytes).digest('hex');
      if (hashes.has(hash)) throw new Error(`Duplicate image bytes on ${product.slug} and ${hashes.get(hash)}`);
      hashes.set(hash, product.slug);
    } catch (error) {
      if (error.code === 'ENOENT') missingImages.push(product.slug);
      else throw error;
    }
  }
  console.log(JSON.stringify({
    activeComponentProducts: products.length, categories: categories.map(({ slug, name, parentId, status }) => ({ slug, name, parentId: Boolean(parentId), status })),
    countsByCategory, uniqueSlugs: new Set(products.map((product) => product.slug)).size,
    productsWithSku: skuProducts.length, duplicateSlugs, duplicateSkus, uniqueImagesOnDisk: hashes.size,
    missingImages, missingManifest, incompleteByCategory,
  }, null, 2));
} finally {
  await disconnectDatabase();
}
