import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma, disconnectDatabase } from '../src/config/database.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(scriptDirectory, 'computer-catalog-expansion.json');
const uploadDirectory = path.resolve(scriptDirectory, '../uploads/catalog');
const projectRoot = path.resolve(scriptDirectory, '../..');
const imageManifestFile = path.join(projectRoot, 'docs/product-image-sources.json');
const items = JSON.parse(await fs.readFile(dataFile, 'utf8'));
const imageManifest = JSON.parse(await fs.readFile(imageManifestFile, 'utf8'));
const imageBySlug = new Map(imageManifest.map((image) => [image.slug, image]));
const existingImages = [
  { slug: 'thinkpad-e14-gen-6', file: 'lenovo-thinkpad-e14-gen-6.jpg' },
  { slug: 'kingston-fury-beast-16gb-ddr5', file: 'kingston-fury-beast-16gb-ddr5.png' },
  { slug: 'logitech-g102-lightsync', file: 'logitech-g102-lightsync.jpg' },
];

async function verifyAsset(file) {
  const fullPath = path.resolve(uploadDirectory, file);
  if (!fullPath.startsWith(`${uploadDirectory}${path.sep}`)) throw new Error(`Invalid asset path: ${file}`);
  const stat = await fs.stat(fullPath);
  if (!stat.isFile() || stat.size < 200) throw new Error(`Missing or empty product image: ${file}`);
  return `/uploads/catalog/${file}`;
}

try {
  const categories = await prisma.category.findMany({
    where: { status: 'ACTIVE', slug: { in: [...new Set(items.map((item) => item.category))] } },
    select: { id: true, slug: true },
  });
  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  for (const item of items) {
    if (!categoryIdBySlug.has(item.category)) throw new Error(`Required active category not found: ${item.category}`);
    const image = imageBySlug.get(item.slug);
    if (!item.slug || !item.title || !item.brand || !item.description || !item.specifications || !image?.imageFile) {
      throw new Error(`Incomplete catalog item: ${item.slug || '(missing slug)'}`);
    }
    if (!['product-photo', 'official-product-render', 'retailer-product-image'].includes(image.kind)) {
      throw new Error(`Image is not verified for product: ${item.slug}`);
    }
    await verifyAsset(image.imageFile);
  }
  for (const image of existingImages) await verifyAsset(image.file);

  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    let alreadyPresent = 0;
    for (const item of items) {
      const found = await tx.book.findUnique({ where: { slug: item.slug }, select: { id: true } });
      if (found) {
        alreadyPresent += 1;
        continue;
      }
      await tx.book.create({ data: {
        title: item.title,
        slug: item.slug,
        author: item.brand,
        brand: item.brand,
        description: item.description,
        image: `/uploads/catalog/${imageBySlug.get(item.slug).imageFile}`,
        price: item.price,
        stock: item.stock,
        status: 'ACTIVE',
        categoryId: categoryIdBySlug.get(item.category),
        specifications: item.specifications,
      } });
      created += 1;
    }
    let imagesFilled = 0;
    for (const image of existingImages) {
      const file = `/uploads/catalog/${image.file}`;
      const updated = await tx.book.updateMany({ where: { slug: image.slug, image: null }, data: { image: file } });
      imagesFilled += updated.count;
    }
    return { created, alreadyPresent, imagesFilled };
  }, { maxWait: 10000, timeout: 60000 });
  console.log(JSON.stringify({ ...result, requestedNewProducts: items.length }));
} finally {
  await disconnectDatabase();
}
