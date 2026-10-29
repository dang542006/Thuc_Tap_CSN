import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma, disconnectDatabase } from '../src/config/database.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = 'https://neocomputer.md/image/cache/catalog/products/ui-products/54fcc760-4c07-11ea-b816-00155d1de702/ab1afec4-f690-494f-a9a4-abda06d5dc1b-1000x1000.jpg';
const fileName = 'amd-ryzen-5-5600-tray.jpg';
const slug = 'amd-ryzen-5-5600-am4';
const destination = path.join(root, 'backend/uploads/catalog', fileName);
const manifestPath = path.join(root, 'docs/product-image-sources.json');

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 5000 || !bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) throw new Error('Expected a JPEG product image.');
  await fs.writeFile(destination, bytes);
  const product = await prisma.book.findUnique({ where: { slug }, include: { _count: { select: { orderItems: true, cartItems: true } } } });
  if (!product || product.isbn !== '100-100000927BOX' || product._count.orderItems || product._count.cartItems) throw new Error('Curated product identity or references changed; no database update performed.');
  await prisma.book.update({ where: { id: product.id }, data: {
    isbn: '100-000000927',
    title: 'AMD Ryzen 5 5600 Tray Desktop Processor',
    description: 'CPU AMD Ryzen 5 5600 dạng tray, 6 nhân/12 luồng, socket AM4, TDP mặc định 65W; không kèm hộp retail hoặc bộ tản nhiệt đóng hộp. Giá và tồn kho trên TechStore là dữ liệu mẫu phục vụ demo.',
    image: `/uploads/catalog/${fileName}`,
    specifications: {
      ...(product.specifications && typeof product.specifications === 'object' ? product.specifications : {}),
      sku: '100-000000927', socket: 'AM4', supportedChipsets: ['X570', 'X470', 'X370', 'B550', 'B450', 'B350', 'A520'],
      architecture: 'Zen 3', cores: 6, threads: 12, baseClockGHz: 3.5, maxBoostGHz: 4.4,
      l3CacheMB: 32, tdpW: 65, defaultTDP: '65W', memoryType: 'DDR4', integratedGraphics: false,
      priceDataType: 'DEMO', stockDataType: 'DEMO',
    },
  } });
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const row = manifest.find((item) => item.slug === slug);
  if (!row) throw new Error('Image manifest row is missing.');
  Object.assign(row, {
    imageFile: fileName, imageSource: url, sourcePage: 'https://neocomputer.md/amd-ryzen-5-5600-tray',
    kind: 'retailer-product-image', verification: 'MODEL_TEXT_VISUALLY_REVIEWED_SOURCE_RECORDED',
    note: 'Local image visually shows the Ryzen 5 5600 marking on the processor heat spreader; listing is the tray variant, not the boxed SKU.',
  });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ updatedSingleCuratedProduct: true, imageBytes: bytes.length, imageMatchReviewed: true }));
} finally {
  await disconnectDatabase();
}
