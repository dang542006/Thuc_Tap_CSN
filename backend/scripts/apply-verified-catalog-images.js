import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prisma, disconnectDatabase } from '../src/config/database.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uploadRoot = path.join(root, 'backend/uploads/catalog');
const manifestPath = path.join(root, 'docs/product-image-sources.json');
const backupRoot = path.join(root, 'backend/.local-backups');
const replaceable = new Set([
  'IMAGE_URL_RECORDED_MODEL_REVIEWED',
  'RETAILER_PRODUCT_PAGE_IMAGE_MODEL_VERIFIED',
  'OFFICIAL_MODEL_ASSET_VERIFIED_NOT_PHOTOGRAPH',
  'OFFICIAL_PRODUCT_PHOTO_MODEL_VERIFIED',
  'RETAILER_PAGE_MODEL_MATCHED_IMAGE_VISUALLY_INSPECTED',
]);

function isSupportedImage(buffer) {
  return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    || buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
}

try {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const hashes = new Map();
  const changes = [];
  for (const item of manifest) {
    if (!replaceable.has(item.verification)) continue;
    if (!item.slug || !item.imageFile || !item.imageSource || !item.sourcePage) throw new Error(`Incomplete verified image row: ${item.slug}`);
    const file = path.resolve(uploadRoot, item.imageFile);
    if (!file.startsWith(`${uploadRoot}${path.sep}`)) throw new Error(`Unsafe image path: ${item.imageFile}`);
    const bytes = await fs.readFile(file);
    if (bytes.length < 200 || !isSupportedImage(bytes)) throw new Error(`Missing or unsupported image asset: ${item.imageFile}`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(hash) && hashes.get(hash) !== item.slug) throw new Error(`Image asset is shared by ${hashes.get(hash)} and ${item.slug}`);
    hashes.set(hash, item.slug);

    const product = await prisma.book.findUnique({ where: { slug: item.slug }, select: { id: true, image: true } });
    if (!product) throw new Error(`Product slug not found in database: ${item.slug}`);
    const nextImage = `/uploads/catalog/${item.imageFile}`;
    if (product.image !== nextImage) changes.push({ id: product.id, slug: item.slug, previousImage: product.image, nextImage });
  }

  if (changes.length) {
    await fs.mkdir(backupRoot, { recursive: true });
    const backupFile = path.join(backupRoot, `catalog-image-refresh-${Date.now()}.json`);
    await fs.writeFile(backupFile, JSON.stringify({ createdAt: new Date().toISOString(), changes }, null, 2), { flag: 'wx' });
    await prisma.$transaction(async (tx) => {
      for (const change of changes) {
        const result = await tx.book.updateMany({ where: { id: change.id, image: change.previousImage }, data: { image: change.nextImage } });
        if (result.count !== 1) throw new Error(`Image changed concurrently for ${change.slug}`);
      }
    });
    console.log(JSON.stringify({ updated: changes.length, unchanged: hashes.size - changes.length, uniqueVerifiedAssets: hashes.size, backup: backupFile }));
  } else {
    console.log(JSON.stringify({ updated: 0, unchanged: hashes.size, uniqueVerifiedAssets: hashes.size }));
  }
} finally {
  await disconnectDatabase();
}
