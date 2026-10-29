import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputDirectory = path.join(root, 'backend/uploads/catalog');
const sources = [
  {
    slug: 'acer-nitro-v15-anv15-41-r2up',
    imageUrl: 'https://cdn-files.hacom.vn/hacom/cdn/web/25022026/Laptop-Acer-Nitro-V-15-ANV15-41-R2UP-NH.QPGSV.004-R5-6600H116GB-RAM512GB-SSDRTX-2050-4GB15.6-inch-FHD-165HzWin-11Den-Likenew-Full-box-1.jpg',
    sourcePage: 'https://hacom.vn/laptop-acer-nitro-v-15-anv15-41-r2up-ltms00011',
  },
  {
    slug: 'wd-blue-sn580-1tb-nvme',
    imageUrl: 'https://bizweb.dktcdn.net/100/329/122/products/ssd-western-digital-blue-sn580-1tb-pcie-gen4-x4-nvme-m-2-wds100t3b0e.jpg?v=1754758883310',
    sourcePage: 'https://memoryzone.com.vn/ssd-western-digital-blue-sn580-1tb-pcie-gen4-x4-nvme-m-2-wds100t3b0e',
  },
  {
    slug: 'samsung-990-evo-plus-1tb',
    imageUrl: 'https://down-sg.img.susercontent.com/file/sg-11134201-7rffz-m9y563d5uqmx08',
    sourcePage: 'https://shopee.sg/Samsung-990-EVO-Plus-NVMe-M.2-SSD-i.412971223.27616462695',
  },
  {
    slug: 'crucial-p3-plus-1tb',
    imageUrl: 'https://ecommerce.datablitz.com.ph/cdn/shop/files/bxdgnxfg_1024x.jpg?v=1749543843',
    sourcePage: 'https://ecommerce.datablitz.com.ph/products/crucial-p3-plus-1tb-pcie-m-2-2280-ssd-ct1000p3pssd8',
  },
  {
    slug: 'asus-dual-geforce-rtx-4060-8gb',
    imageUrl: 'https://media.topachat.com/media/s550/6499a5f10682736fb65963e6.jpg',
    sourcePage: 'https://www.topachat.com/pages/detail2_cat_est_micro_puis_rubrique_est_wgfx_pcie_puis_ref_est_in20019027.html',
  },
  {
    slug: 'gigabyte-b760m-ds3h-ddr4',
    imageUrl: 'https://i5.walmartimages.com/asr/219ea22f-ef52-45f5-89d8-37008f87cb49.fc6d24a49d5524d399ae3dce68b683d1.jpeg?odnBg=FFFFFF&odnHeight=2000&odnWidth=2000',
    sourcePage: 'https://www.walmart.ca/en/ip/GIGABYTE-B760M-DS3H-Micro-ATX-Motherboard-LGA1700-Socket-B760-Chipset-New/0ZLA96PMRL6B',
  },
  {
    slug: 'deepcool-ak400-cpu-cooler',
    imageUrl: 'https://fly.bg/uploads/products/as/deepcool_ak400_cpu_air_cooler_1x120mm_pwm_fan_tdp_gwx9n.jpg',
    sourcePage: 'https://fly.bg/deepcool-ak400-cpu-air-cooler-1x120mm-pwm-fan-td-ak400-257271',
  },
  {
    slug: 'logitech-m331-silent-plus',
    imageUrl: 'https://bizweb.dktcdn.net/100/326/151/products/4324341.png?v=1734687939553',
    sourcePage: 'https://www.kimlong.vn/mouse-logitech-m331-wireless-optical-den-black',
  },
  {
    slug: 'razer-deathadder-essential',
    imageUrl: 'https://product.hstatic.net/200000722513/product/thumbchuot_7445abea69bf461e881eeba2b6cbbd8d.jpg',
    sourcePage: 'https://gearvn.com/products/razer-deathadder-essential',
  },
  {
    slug: 'logitech-c270-hd-webcam',
    imageUrl: 'https://product.hstatic.net/200000420363/product/wc-lgt-c270-3-new_f58aa5f99ec64a599d474807f8321b49_1024x1024.jpg',
    sourcePage: 'https://tinhocngoisao.com/products/webcam-logitech-c270-hd-720p-30-fps-microphone-usb-960-000694',
  },
  {
    slug: 'hyperx-cloud-stinger-2-core',
    imageUrl: 'https://multimedia.bbycastatic.ca/multimedia/products/500x500/164/16474/16474334_7.jpg',
    sourcePage: 'https://www.bestbuy.ca/en-ca/product/hyperx-cloud-stinger-2-core-gaming-headset-black/16474334',
  },
  {
    slug: 'amd-ryzen-5-7600-desktop-cpu',
    imageUrl: 'https://nguyencongpc.vn/media/product/24146-cpu-amd-ryzen-5-7600-04.jpg',
    sourcePage: 'https://nguyencongpc.vn/amd-ryzen-5-7600',
  },
];

function imageType(bytes) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw new Error('The response was not a supported raster image');
}

await mkdir(outputDirectory, { recursive: true });
const manifestPath = path.join(root, 'docs/product-image-sources.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const bySlug = new Map(manifest.map((record) => [record.slug, record]));
const planned = [];
const hashes = new Set();

for (const source of sources) {
  if (!bySlug.has(source.slug)) throw new Error(`No existing manifest record for ${source.slug}`);
  const response = await fetch(source.imageUrl, {
    headers: { 'User-Agent': 'TechStoreCatalogImageVerifier/1.0', Referer: source.sourcePage },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Image request failed for ${source.slug}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000) throw new Error(`Image is unexpectedly small for ${source.slug}`);
  const extension = imageType(bytes);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hashes.has(hash)) throw new Error(`Two requested models resolved to the same image: ${source.slug}`);
  hashes.add(hash);
  const imageFile = `${source.slug}-retailer.${extension}`;
  planned.push({ ...source, imageFile, hash, bytes });
}

for (const item of planned) {
  await writeFile(path.join(outputDirectory, item.imageFile), item.bytes, { flag: 'w' });
}
console.log(JSON.stringify(planned.map(({ slug, imageFile, imageUrl, sourcePage, hash, bytes }) => ({
  slug, imageFile, imageUrl, sourcePage, sha256: hash, bytes: bytes.length,
}))));
