import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = path.join(root, 'docs/product-image-sources.json');
const imageRoot = path.join(root, 'backend/uploads/catalog');
const backupRoot = path.join(root, 'backend/.local-backups');
const sources = [
  ['acer-nitro-v15-anv15-41-r2up', 'acer-nitro-v15-anv15-41-r2up-retailer.jpg', 'https://cdn-files.hacom.vn/hacom/cdn/web/25022026/Laptop-Acer-Nitro-V-15-ANV15-41-R2UP-NH.QPGSV.004-R5-6600H116GB-RAM512GB-SSDRTX-2050-4GB15.6-inch-FHD-165HzWin-11Den-Likenew-Full-box-1.jpg', 'https://hacom.vn/laptop-acer-nitro-v-15-anv15-41-r2up-ltms00011', 'Retailer listing identifies exact Acer Nitro V ANV15-41-R2UP; image is a clean packshot/render, not a camera photograph.'],
  ['wd-blue-sn580-1tb-nvme', 'wd-blue-sn580-1tb-nvme-retailer.jpg', 'https://bizweb.dktcdn.net/100/329/122/products/ssd-western-digital-blue-sn580-1tb-pcie-gen4-x4-nvme-m-2-wds100t3b0e.jpg?v=1754758883310', 'https://memoryzone.com.vn/ssd-western-digital-blue-sn580-1tb-pcie-gen4-x4-nvme-m-2-wds100t3b0e', 'Retailer image visibly labels WD Blue SN580, PCIe 4.0 and 1TB; isolated product packshot.'],
  ['samsung-990-evo-plus-1tb', 'samsung-990-evo-plus-1tb-retailer.jpg', 'https://down-sg.img.susercontent.com/file/sg-11134201-7rffz-m9y563d5uqmx08', 'https://shopee.sg/Samsung-990-EVO-Plus-NVMe-M.2-SSD-i.412971223.27616462695', 'Shopee listing identifies 990 EVO Plus NVMe M.2 SSD 1TB; image includes Official Store and model text.'],
  ['crucial-p3-plus-1tb', 'crucial-p3-plus-1tb-retailer.jpg', 'https://ecommerce.datablitz.com.ph/cdn/shop/files/bxdgnxfg_1024x.jpg?v=1749543843', 'https://ecommerce.datablitz.com.ph/products/crucial-p3-plus-1tb-pcie-m-2-2280-ssd-ct1000p3pssd8', 'Retailer page is for Crucial P3 Plus CT1000P3PSSD8; image visibly identifies P3 Plus and 1TB.'],
  ['asus-dual-geforce-rtx-4060-8gb', 'asus-dual-geforce-rtx-4060-8gb-retailer.jpg', 'https://media.topachat.com/media/s550/6499a5f10682736fb65963e6.jpg', 'https://www.topachat.com/pages/detail2_cat_est_micro_puis_rubrique_est_wgfx_pcie_puis_ref_est_in20019027.html', 'Retailer image shows ASUS Dual GeForce RTX 4060 8GB card and matching box.'],
  ['gigabyte-b760m-ds3h-ddr4', 'gigabyte-b760m-ds3h-ddr4-retailer.jpg', 'https://i5.walmartimages.com/asr/219ea22f-ef52-45f5-89d8-37008f87cb49.fc6d24a49d5524d399ae3dce68b683d1.jpeg?odnBg=FFFFFF&odnHeight=2000&odnWidth=2000', 'https://www.walmart.ca/en/ip/GIGABYTE-B760M-DS3H-Micro-ATX-Motherboard-LGA1700-Socket-B760-Chipset-New/0ZLA96PMRL6B', 'The box in the retailer image visibly identifies B760M DS3H DDR4; board layout matches the listing.'],
  ['deepcool-ak400-cpu-cooler', 'deepcool-ak400-cpu-cooler-retailer.png', 'https://fly.bg/uploads/products/as/deepcool_ak400_cpu_air_cooler_1x120mm_pwm_fan_tdp_gwx9n.jpg', 'https://fly.bg/deepcool-ak400-cpu-air-cooler-1x120mm-pwm-fan-td-ak400-257271', 'Retailer page names DeepCool AK400; image is a studio packshot/render.'],
  ['logitech-m331-silent-plus', 'logitech-m331-silent-plus-retailer.png', 'https://bizweb.dktcdn.net/100/326/151/products/4324341.png?v=1734687939553', 'https://www.kimlong.vn/mouse-logitech-m331-wireless-optical-den-black', 'Retailer page identifies Logitech M331; image shows the matching black product, isolated on transparent background.'],
  ['razer-deathadder-essential', 'razer-deathadder-essential-retailer.jpg', 'https://product.hstatic.net/200000722513/product/thumbchuot_7445abea69bf461e881eeba2b6cbbd8d.jpg', 'https://gearvn.com/products/razer-deathadder-essential', 'GEARVN page identifies RZ01-03850100-R3M1; image shows the matching black wired mouse.'],
  ['logitech-c270-hd-webcam', 'logitech-c270-hd-webcam-retailer.jpg', 'https://product.hstatic.net/200000420363/product/wc-lgt-c270-3-new_f58aa5f99ec64a599d474807f8321b49_1024x1024.jpg', 'https://tinhocngoisao.com/products/webcam-logitech-c270-hd-720p-30-fps-microphone-usb-960-000694', 'Retailer page identifies Logitech C270 960-000694; image shows the camera and matching retail box.'],
  ['hyperx-cloud-stinger-2-core', 'hyperx-cloud-stinger-2-core-retailer.jpg', 'https://multimedia.bbycastatic.ca/multimedia/products/500x500/164/16474/16474334_7.jpg', 'https://www.bestbuy.ca/en-ca/product/hyperx-cloud-stinger-2-core-gaming-headset-black/16474334', 'Best Buy page identifies Cloud Stinger 2 Core black wired headset; image shows matching headset and box.'],
  ['amd-ryzen-5-7600-desktop-cpu', 'amd-ryzen-5-7600-desktop-cpu-retailer.jpg', 'https://nguyencongpc.vn/media/product/24146-cpu-amd-ryzen-5-7600-04.jpg', 'https://nguyencongpc.vn/amd-ryzen-5-7600', 'Retailer photograph visibly shows the Ryzen 5 7600 package and CPU marking.'],
];

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const bySlug = new Map(manifest.map((item) => [item.slug, item]));
for (const [slug, imageFile, imageSource, sourcePage] of sources) {
  const item = bySlug.get(slug);
  if (!item) throw new Error(`Manifest entry not found: ${slug}`);
  const file = path.resolve(imageRoot, imageFile);
  if (!file.startsWith(`${imageRoot}${path.sep}`)) throw new Error(`Unsafe image path: ${imageFile}`);
  const info = await stat(file);
  if (!info.isFile() || info.size < 1000) throw new Error(`Downloaded image missing or too small: ${imageFile}`);
}

await mkdir(backupRoot, { recursive: true });
const backupFile = path.join(backupRoot, `product-image-sources-${Date.now()}.json`);
await copyFile(manifestPath, backupFile);
for (const [slug, imageFile, imageSource, sourcePage, note] of sources) {
  const item = bySlug.get(slug);
  item.imageFile = imageFile;
  item.imageSource = imageSource;
  item.sourcePage = sourcePage;
  item.kind = 'retailer-product-image';
  item.verification = 'RETAILER_PAGE_MODEL_MATCHED_IMAGE_VISUALLY_INSPECTED';
  item.note = note;
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ updatedManifestRows: sources.length, backup: backupFile }));
