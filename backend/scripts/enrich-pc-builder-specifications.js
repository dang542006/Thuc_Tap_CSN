import { prisma, disconnectDatabase } from '../src/config/database.js';

const enrichment = {
  'amd-ryzen-5-7600-desktop-cpu': {
    fields: { tdpW: 65, defaultTDP: '65W', supportedChipsets: ['A620', 'X670E', 'X670', 'B650E', 'B650', 'X870E', 'X870', 'B840', 'B850'], integratedGraphics: 'AMD Radeon Graphics', memoryType: 'DDR5' },
    source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html',
  },
  'gigabyte-b760m-ds3h-ddr4': {
    fields: { socket: 'LGA1700', chipset: 'B760', memoryType: 'DDR4', memorySlots: 4, maxMemoryGB: 128, formFactor: 'Micro-ATX', supportedCpuSeries: ['Intel Core 12th Gen', 'Intel Core 13th Gen', 'Intel Core 14th Gen'], storageInterfaces: ['M.2 PCIe 4.0 x4', 'M.2 PCIe 4.0 x4', 'SATA'] },
    source: 'https://www.gigabyte.com/Motherboard/B760M-DS3H-DDR4-rev-10/sp?lan=en',
  },
  'asus-dual-geforce-rtx-4060-8gb': {
    fields: { vramGB: 8, lengthMm: 227.2, powerConnectors: ['1x 8-pin'], recommendedPSUW: 550 },
    source: 'https://www.asus.com/in/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/',
  },
  'asus-prime-b650m-a': {
    fields: { cpuPowerConnectors: ['1x 8-pin ATX12V'] },
    source: 'https://www.asus.com/motherboards-components/motherboards/prime/prime-b650m-a/techspec/',
  },
  'msi-mag-a650bn-650w': {
    fields: { wattageW: 650, formFactor: 'ATX', gpuConnectors: ['2x 6+2-pin'], cpuConnectors: ['1x EPS 4+4 pin'], dimensionsMM: '140 x 150 x 86' },
    source: 'https://www.msi.com/Power-Supply/MAG-A650BN/Specification',
  },
  'deepcool-ak400-cpu-cooler': {
    fields: { supportedSockets: ['LGA1851', 'LGA1700', 'LGA1200', 'LGA1151', 'LGA1150', 'LGA1155', 'AM5', 'AM4'], coolerHeightMM: 155, heightMm: 155, maxTdpW: 220, productDimensionsMM: '127 x 97 x 155' },
    source: 'https://www.deepcool.com/products/Cooling/cpuaircoolers/AK400-Performance-CPU-Cooler-1851-1700-AM5/2024/15222.shtml',
  },
  'cooler-master-masterbox-nr600-odd': {
    fields: { fanAndRadiatorSupportVariant: 'Official page labels the detailed fan/radiator mount list as non-ODD version; this ODD variant is not assigned those values.', fanSupportNonOddVariant: ['120mm', '140mm'], radiatorSupportByLocationNonOddVariant: { front: [120, 140, 240, 280], top: [120, 240], rear: [120] } },
    removeFields: ['fanSupport', 'radiatorSupport', 'radiatorSupportByLocation'],
    source: 'https://www.coolermaster.com/en-us/products/masterbox-nr600-with-odd.html',
  },
  'kingston-fury-beast-16gb-ddr5': {
    fields: { memoryType: 'DDR5', capacityGB: 16, moduleCount: 1, speedMTs: 5600, kitType: '1 x 16GB' },
    source: 'https://gearvn.com/products/ram-kingston-fury-beast-16gb-1x16gb-buss-5600-ddr5-kf556c40bb-16wp',
  },
  'crucial-p3-plus-1tb': {
    fields: { capacityGB: 1000, interface: 'PCIe Gen4 NVMe', formFactor: 'M.2 2280' },
    source: 'https://www.crucial.com/content/dam/crucial/ssd-products/p3-plus/flyers/b2c/crucial-p3plus-productflyer-consumer.pdf',
  },
  'samsung-990-evo-plus-1tb': {
    fields: { capacityGB: 1000, interface: 'PCIe 4.0 x4 / PCIe 5.0 x2 NVMe 2.0', formFactor: 'M.2 2280' },
    source: 'https://download.semiconductor.samsung.com/resources/data-sheet/samsung_nvme_ssd_990_evo_plus_datasheet_rev.1.0_10139908980019.pdf',
  },
  'wd-blue-sn580-1tb-nvme': {
    fields: { capacityGB: 1000, interface: 'PCIe Gen4 NVMe 1.4b', formFactor: 'M.2 2280' },
    source: 'https://documents.westerndigital.com/content/dam/doc-library/en_us/assets/public/western-digital/product/internal-drives/wd-blue-ssd/product-brief-wd-blue-sn580-nvme-ssd.pdf',
  },
};

try {
  const result = { productsFound: 0, fieldsAdded: 0, conflictsPreserved: 0, productsMissing: [] };
  for (const [slug, entry] of Object.entries(enrichment)) {
    const product = await prisma.book.findUnique({ where: { slug }, select: { id: true, specifications: true } });
    if (!product) { result.productsMissing.push(slug); continue; }
    result.productsFound += 1;
    const current = product.specifications && typeof product.specifications === 'object' ? product.specifications : {};
    const next = { ...current };
    const addedFields = {};
    const conflictFields = [];
    for (const [key, value] of Object.entries(entry.fields)) {
      if (next[key] === undefined || next[key] === null || next[key] === '') { next[key] = value; addedFields[key] = value; }
      else if (JSON.stringify(next[key]) !== JSON.stringify(value)) conflictFields.push(key);
    }
    let removedFields = 0;
    if (entry.removeFields && current.sku === 'MCB-NR600-KG5N-S00') {
      for (const key of entry.removeFields) if (Object.hasOwn(next, key)) { delete next[key]; removedFields += 1; }
    }
    const sources = { ...(next.specificationSources || {}) };
    for (const key of Object.keys(addedFields)) sources[key] = entry.source;
    next.specificationSources = sources;
    if (Object.keys(addedFields).length || removedFields) {
      await prisma.book.update({ where: { id: product.id }, data: { specifications: next } });
      result.fieldsAdded += Object.keys(addedFields).length;
    }
    result.conflictsPreserved += conflictFields.length;
  }
  console.log(JSON.stringify(result));
} finally {
  await disconnectDatabase();
}
