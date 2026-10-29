import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prisma, disconnectDatabase } from '../src/config/database.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(directory, '../..');
const uploadDirectory = path.resolve(directory, '../uploads/catalog');
const items = JSON.parse(await fs.readFile(path.join(directory, 'pc-builder-catalog-expansion.json'), 'utf8'));
const manifestPath = path.join(projectRoot, 'docs/product-image-sources.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const manifestBySlug = new Map(manifest.map((item) => [item.slug, item]));
const categoryNames = { case: 'Case máy tính', 'quat-case': 'Quạt case' };
const validImage = (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  || buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  || (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP');

async function getAsset(item) {
  const filePath = path.join(uploadDirectory, item.imageFile);
  try {
    const data = await fs.readFile(filePath);
    if (data.length < 5000 || !validImage(data)) throw new Error(`Existing asset is not a valid image: ${item.imageFile}`);
    return data;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const response = await fetch(item.imageSource, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Image download failed (${response.status}) for ${item.slug}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length < 5000 || !validImage(data)) throw new Error(`Downloaded asset is not a supported image: ${item.slug}`);
  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(filePath, data, { flag: 'wx' });
  return data;
}

try {
  const uniqueSkus = new Set();
  const assetHashes = new Map();
  const assets = new Map();
  for (const item of items) {
    if (!item.slug || !item.sku || !item.title || !item.specifications || !item.sourcePage || !item.imageSource) throw new Error('Catalog row is incomplete.');
    if (uniqueSkus.has(item.sku)) throw new Error(`Duplicate SKU in import file: ${item.sku}`);
    uniqueSkus.add(item.sku);
    const asset = await getAsset(item);
    const hash = createHash('sha256').update(asset).digest('hex');
    if (assetHashes.has(hash)) throw new Error(`Image reused by ${assetHashes.get(hash)} and ${item.slug}`);
    assetHashes.set(hash, item.slug);
    assets.set(item.slug, asset);
  }
  const existingAssetNames = await fs.readdir(uploadDirectory);
  const existingHashes = new Set();
  for (const filename of existingAssetNames) {
    if (items.some((item) => item.imageFile === filename)) continue;
    const data = await fs.readFile(path.join(uploadDirectory, filename));
    existingHashes.add(createHash('sha256').update(data).digest('hex'));
  }
  for (const [slug, asset] of assets) {
    if (existingHashes.has(createHash('sha256').update(asset).digest('hex'))) throw new Error(`Image bytes already belong to another catalog item: ${slug}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const parent = await tx.category.findUnique({ where: { slug: 'linh-kien' }, select: { id: true, status: true } });
    if (!parent || parent.status !== 'ACTIVE') throw new Error('Active parent category linh-kien was not found.');
    const categories = {};
    let createdCategories = 0;
    for (const slug of Object.keys(categoryNames)) {
      const found = await tx.category.findUnique({ where: { slug }, select: { id: true, status: true } });
      if (found && found.status !== 'ACTIVE') throw new Error(`Category ${slug} exists but is inactive; no implicit reactivation was made.`);
      if (found) categories[slug] = found;
      else {
        categories[slug] = await tx.category.create({ data: { name: categoryNames[slug], slug, parentId: parent.id, status: 'ACTIVE' }, select: { id: true, status: true } });
        createdCategories += 1;
      }
    }
    let created = 0;
    let skipped = 0;
    const createdSlugs = [];
    const matchingExistingSlugs = [];
    for (const item of items) {
      const category = categories[item.category] ?? await tx.category.findUnique({ where: { slug: item.category }, select: { id: true, status: true } });
      if (!category || category.status !== 'ACTIVE') throw new Error(`Required active category ${item.category} was not found.`);
      const bySlug = await tx.book.findUnique({ where: { slug: item.slug }, select: { id: true, image: true } });
      const bySku = await tx.book.findUnique({ where: { isbn: item.sku }, select: { id: true, image: true, slug: true } });
      if (bySlug || bySku) {
        skipped += 1;
        const existing = bySlug ?? bySku;
        if (existing.slug === item.slug && existing.image === `/uploads/catalog/${item.imageFile}`) matchingExistingSlugs.push(item.slug);
        continue;
      }
      await tx.book.create({ data: {
        title: item.title, slug: item.slug, author: item.brand, brand: item.brand,
        isbn: item.sku, description: item.description, image: `/uploads/catalog/${item.imageFile}`,
        price: item.price, stock: item.stock, status: 'ACTIVE', categoryId: category.id,
        specifications: item.specifications,
      } });
      created += 1;
      createdSlugs.push(item.slug);
    }
    return { created, skipped, createdCategories, createdSlugs, matchingExistingSlugs };
  }, { maxWait: 10000, timeout: 60000 });

  const manifestAdded = [];
  for (const item of items) {
    if (!manifestBySlug.has(item.slug) && [...result.createdSlugs, ...result.matchingExistingSlugs].includes(item.slug)) {
      const row = {
        slug: item.slug, imageFile: item.imageFile, kind: item.imageKind,
        imageSource: item.imageSource, sourcePage: item.sourcePage,
        verification: 'SOURCE_RECORDED_VISUAL_MODEL_REVIEW_PENDING',
        note: 'Local product image downloaded; exact model/content requires visual review before counting as verified.'
      };
      manifest.push(row);
      manifestAdded.push(item.slug);
    }
  }
  if (manifestAdded.length) await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ created: result.created, skipped: result.skipped, createdCategories: result.createdCategories, manifestAdded, imagesValidated: assets.size, priceAndStock: 'DEMO' }));
} finally {
  await disconnectDatabase();
}
