import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const dataFile = path.join(directory, 'computer-catalog-expansion.json');
const backupDirectory = path.join(root, 'backend/.local-backups');
const imageFile = path.join(root, 'docs/product-image-sources.json');
const categoryBySlug = {
  'asus-vivobook-15-x1504va': 'laptop-van-phong-hoc-tap',
  'dell-inspiron-5440-i5-16gb': 'laptop-van-phong-hoc-tap',
  'acer-aspire-5-a515-58m-79r7': 'laptop-van-phong-hoc-tap',
  'lenovo-ideapad-slim-5-14irl8': 'laptop-van-phong-hoc-tap',
  'hp-15-fd-series': 'laptop-van-phong-hoc-tap',
  'asus-tuf-gaming-a15-fa507nv': 'laptop-gaming',
  'acer-nitro-v15-anv15-41-r2up': 'laptop-gaming',
  'amd-ryzen-5-7600-desktop-cpu': 'cpu',
  'wd-blue-sn580-1tb-nvme': 'o-luu-tru',
  'samsung-990-evo-plus-1tb': 'o-luu-tru',
  'crucial-p3-plus-1tb': 'o-luu-tru',
  'asus-dual-geforce-rtx-4060-8gb': 'gpu',
  'gigabyte-b760m-ds3h-ddr4': 'mainboard',
  'msi-mag-a650bn-650w': 'nguon-may-tinh',
  'deepcool-ak400-cpu-cooler': 'tan-nhiet-cpu',
  'logitech-m331-silent-plus': 'chuot',
  'logitech-pebble-keys-2-k380s': 'ban-phim',
  'logitech-g435-lightspeed': 'tai-nghe-am-thanh',
  'razer-deathadder-essential': 'chuot',
  'logitech-c270-hd-webcam': 'webcam',
  'hyperx-cloud-stinger-2-core': 'tai-nghe-am-thanh',
  'tp-link-archer-tx20u-plus': 'ket-noi-mang',
};

const items = JSON.parse(await readFile(dataFile, 'utf8'));
const images = JSON.parse(await readFile(imageFile, 'utf8'));
const imageBySlug = new Map(images.map((image) => [image.slug, image]));
for (const item of items) {
  const image = imageBySlug.get(item.slug);
  if (!categoryBySlug[item.slug] || !image?.imageFile) throw new Error(`Catalog mapping is incomplete: ${item.slug}`);
  item.category = categoryBySlug[item.slug];
  item.imageFile = image.imageFile;
}

await mkdir(backupDirectory, { recursive: true });
const backup = path.join(backupDirectory, `computer-catalog-expansion-${Date.now()}.json`);
await copyFile(dataFile, backup);
await writeFile(dataFile, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ productsMapped: items.length, leafCategories: new Set(items.map((item) => item.category)).size, backup }));
