const requiredSlots = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'cooler', 'case'];
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const list = (value) => Array.isArray(value) ? value : value == null || value === '' ? [] : String(value).split(/[,;/|]/).map((item) => item.trim()).filter(Boolean);
const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const number = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = String(value ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};
const check = (key, status, message) => ({ key, status, message });
const unknown = (key, message) => check(key, 'UNKNOWN', message);
const compatible = (key, message) => check(key, 'COMPATIBLE', message);
const incompatible = (key, message) => check(key, 'INCOMPATIBLE', message);

function compareKnown(left, right, label, key) {
  if (left == null || right == null || left === '' || right === '') return unknown(key, `Chưa đủ thông số ${label} ở cả hai linh kiện để xác minh.`);
  return normalize(left) === normalize(right)
    ? compatible(key, `${label}: ${left}.`)
    : incompatible(key, `${label} không khớp (${left} và ${right}).`);
}

function canonicalFormFactor(value) {
  const form = normalize(value).replace(/[.\s_-]/g, '');
  if (['atx', 'standardatx'].includes(form)) return 'atx';
  if (['microatx', 'matx', 'uatx'].includes(form)) return 'micro-atx';
  if (['miniitx', 'mitx', 'itx'].includes(form)) return 'mini-itx';
  if (['eatx', 'extendedatx'].includes(form)) return 'e-atx';
  return form || null;
}

function parseConnectors(value) {
  return list(value).map((item) => {
    const normalized = normalize(item).replace(/\s/g, '');
    const count = Number(normalized.match(/^(\d+)x/)?.[1] || 1);
    const token = normalized.replace(/^\d+x/, '').replace(/[^a-z0-9+]/g, '');
    let kind = null;
    if (/12v2x6|12vhpwr|16pin/.test(token)) kind = '16-pin';
    else if (/6\+2pin|8pin/.test(token)) kind = '8-pin';
    else if (/6pin/.test(token)) kind = '6-pin';
    return { raw: kind, count };
  });
}

function connectorCompatible(gpuValue, psuValue) {
  const required = parseConnectors(gpuValue);
  const available = parseConnectors(psuValue);
  if (!required.length || !available.length || required.some((item) => !item.raw) || available.some((item) => !item.raw)) return null;
  const availableCounts = new Map();
  for (const item of available) availableCounts.set(item.raw, (availableCounts.get(item.raw) || 0) + item.count);
  for (const item of required) {
    const count = availableCounts.get(item.raw) || 0;
    if (count < item.count) return false;
    availableCounts.set(item.raw, count - item.count);
  }
  return true;
}

export function getBuildCompatibility(parts = {}) {
  const checks = [];
  const cpu = parts.cpu?.specifications ?? {};
  const board = parts.motherboard?.specifications ?? {};
  const ram = parts.ram?.specifications ?? {};
  const gpu = parts.gpu?.specifications ?? {};
  const storage = parts.storage?.specifications ?? {};
  const psu = parts.psu?.specifications ?? {};
  const cooler = parts.cooler?.specifications ?? {};
  const pcCase = parts.case?.specifications ?? {};
  const fan = parts.fan?.specifications ?? {};

  if (parts.cpu && parts.motherboard) {
    checks.push(compareKnown(cpu.socket, board.socket, 'socket CPU/mainboard', 'cpu-socket'));
    const chipset = first(board.chipset, board.chipsetName);
    const supportedChipsets = list(first(cpu.supportedChipsets, cpu.chipsets));
    if (!chipset || !supportedChipsets.length) checks.push(unknown('cpu-chipset', 'Socket khớp chưa đủ để kết luận CPU được chipset hỗ trợ; catalog chưa có danh sách chipset hỗ trợ chính thức.'));
    else if (supportedChipsets.some((item) => normalize(item) === normalize(chipset))) checks.push(compatible('cpu-chipset', `CPU ghi hỗ trợ chipset ${chipset}.`));
    else checks.push(incompatible('cpu-chipset', `Chưa thấy chipset ${chipset} trong danh sách hỗ trợ CPU đã ghi.`));
    const minBios = first(cpu.minimumBiosVersion, cpu.minBiosVersion);
    const boardBios = first(board.biosVersion, board.installedBiosVersion);
    if (minBios && boardBios) checks.push(compatible('cpu-bios', `BIOS mainboard ${boardBios}; mức tối thiểu CPU ${minBios} cần được đối chiếu theo phiên bản.`));
    else checks.push(unknown('cpu-bios', 'Chưa có dữ liệu phiên bản BIOS tối thiểu/đang cài; cần kiểm tra CPU support list của hãng mainboard.'));
  }

  if (parts.ram && parts.motherboard) {
    const ramGeneration = first(ram.memoryType, ram.type, ram.memory);
    const boardGeneration = first(board.memoryType, board.memory);
    const ramMatch = String(ramGeneration ?? '').match(/DDR\s*\d/i)?.[0]?.replace(/\s/g, '').toUpperCase();
    const boardMatch = String(boardGeneration ?? '').match(/DDR\s*\d/i)?.[0]?.replace(/\s/g, '').toUpperCase();
    checks.push(compareKnown(ramMatch, boardMatch, 'chuẩn RAM/mainboard', 'ram-generation'));
    const slots = number(first(board.memorySlots, board.dimmSlots));
    const modules = number(first(ram.moduleCount, ram.modules));
    const capacity = number(first(ram.capacityGB, ram.capacity));
    const maxMemory = number(first(board.maxMemoryGB, board.maxMemory));
    if (slots != null && modules != null) checks.push(modules <= slots ? compatible('ram-slots', `${modules} thanh RAM không vượt ${slots} khe.`) : incompatible('ram-slots', `${modules} thanh RAM vượt quá ${slots} khe.`));
    else checks.push(unknown('ram-slots', 'Chưa đủ dữ liệu số thanh RAM hoặc số khe DIMM của mainboard.'));
    if (capacity != null && maxMemory != null) checks.push(capacity <= maxMemory ? compatible('ram-capacity', `${capacity} GB không vượt giới hạn ${maxMemory} GB của mainboard.`) : incompatible('ram-capacity', `${capacity} GB vượt giới hạn ${maxMemory} GB của mainboard.`));
    else checks.push(unknown('ram-capacity', 'Chưa đủ dữ liệu dung lượng RAM hoặc giới hạn bộ nhớ mainboard.'));
  }

  if (parts.motherboard && parts.psu) {
    const boardPower = list(first(board.cpuPowerConnectors, board.epsConnectors, board.cpuPower));
    const psuPower = list(first(psu.cpuConnectors, psu.epsConnectors, psu.connectors?.cpu));
    if (!boardPower.length || !psuPower.length) {
      checks.push(unknown('cpu-power-connector', 'Chưa có đủ dữ liệu đầu EPS trên mainboard và đầu cấp nguồn CPU trên PSU.'));
    } else {
      const normalized = (items) => items.map((item) => {
        const token = normalize(item).replace(/\s/g, '').replace(/eps/gi, '').replace(/[^a-z0-9+]/g, '');
        if (/4\+4pin|8pin/.test(token)) return '8-pin';
        if (/4pin/.test(token)) return '4-pin';
        return token;
      });
      const psuConnectors = normalized(psuPower);
      const supported = normalized(boardPower).every((required) => psuConnectors.some((available) => available === required || available.includes(required)));
      checks.push(supported
        ? compatible('cpu-power-connector', 'Các đầu EPS của mainboard có trong danh sách đầu cấp nguồn CPU của PSU.')
        : incompatible('cpu-power-connector', 'PSU không ghi đủ đầu EPS theo cấu hình mainboard.'));
    }
  }

  if (parts.storage && parts.motherboard) {
    const interfaceName = normalize(first(storage.interface, storage.bus));
    const boardStorage = normalize(first(board.storageInterfaces, board.storage));
    if (!interfaceName || !boardStorage) checks.push(unknown('storage-interface', 'Chưa đủ dữ liệu giao tiếp ổ lưu trữ và các khe/ cổng mainboard.'));
    else if (/sata/.test(interfaceName) && /sata/.test(boardStorage)) checks.push(compatible('storage-interface', 'Ổ SATA và mainboard đều ghi hỗ trợ SATA.'));
    else if (/nvme|pcie/.test(interfaceName) && /m\.2/.test(boardStorage) && /pcie|nvme/.test(boardStorage)) checks.push(compatible('storage-interface', 'Ổ NVMe PCIe M.2 và mainboard đều ghi hỗ trợ M.2 PCIe.'));
    else if (/m\.2/.test(interfaceName) && /m\.2/.test(boardStorage) && /sata/.test(interfaceName) && /sata/.test(boardStorage)) checks.push(compatible('storage-interface', 'Ổ M.2 SATA và mainboard đều ghi hỗ trợ M.2 SATA.'));
    else checks.push(incompatible('storage-interface', 'Giao tiếp ổ lưu trữ không khớp các giao tiếp được ghi cho mainboard.'));
  }

  if (parts.cooler && parts.cpu) {
    const supportedSockets = list(first(cooler.supportedSockets, cooler.compatibleSockets, cooler.sockets));
    if (!supportedSockets.length || !cpu.socket) checks.push(unknown('cooler-socket', 'Catalog chưa ghi socket được tản nhiệt hỗ trợ hoặc socket CPU.'));
    else checks.push(supportedSockets.some((socket) => normalize(socket) === normalize(cpu.socket))
      ? compatible('cooler-socket', `Tản nhiệt ghi hỗ trợ ${cpu.socket}.`)
      : incompatible('cooler-socket', `Tản nhiệt không ghi hỗ trợ socket ${cpu.socket}.`));
    const coolerTdp = number(first(cooler.maxTdpW, cooler.tdpRatingW));
    const cpuTdp = number(first(cpu.tdpW, cpu.defaultTDP, cpu.tdp));
    if (coolerTdp != null && cpuTdp != null) checks.push(coolerTdp >= cpuTdp ? compatible('cooler-capacity', `Mức tản nhiệt ${coolerTdp} W không thấp hơn TDP ${cpuTdp} W đã công bố.`) : incompatible('cooler-capacity', `Mức tản nhiệt ${coolerTdp} W thấp hơn TDP ${cpuTdp} W.`));
    else checks.push(unknown('cooler-capacity', 'Chưa đủ mức tản nhiệt định mức và TDP CPU để đối chiếu.'));
  }

  if (parts.motherboard && parts.case) {
    const boardForm = canonicalFormFactor(first(board.formFactor, board.motherboardFormFactor));
    const supportedForms = list(first(pcCase.supportedMotherboardFormats, pcCase.supportedMotherboards, pcCase.motherboardFormFactors)).map(canonicalFormFactor);
    if (!boardForm || !supportedForms.length) checks.push(unknown('case-form-factor', 'Catalog chưa ghi kích thước mainboard hoặc các chuẩn mainboard case hỗ trợ.'));
    else checks.push(supportedForms.includes(boardForm) ? compatible('case-form-factor', `Case hỗ trợ mainboard ${boardForm}.`) : incompatible('case-form-factor', `Case không ghi hỗ trợ mainboard ${boardForm}.`));
  }

  if (parts.psu && parts.case) {
    const psuForm = canonicalFormFactor(first(psu.formFactor, psu.psuFormFactor));
    const supportedPsuForms = list(first(pcCase.psuFormFactors, pcCase.psuFormFactor)).map(canonicalFormFactor);
    if (!psuForm || !supportedPsuForms.length) checks.push(unknown('case-psu-form-factor', 'Chưa có đủ dữ liệu kích thước PSU và chuẩn nguồn mà case hỗ trợ.'));
    else checks.push(supportedPsuForms.includes(psuForm)
      ? compatible('case-psu-form-factor', `Case ghi hỗ trợ PSU ${psuForm}.`)
      : incompatible('case-psu-form-factor', `Case không ghi hỗ trợ PSU ${psuForm}.`));
  }

  if (parts.gpu && parts.case) {
    const gpuLength = number(first(gpu.lengthMm, gpu.lengthMM, gpu.cardLengthMm));
    const maxGpuLength = number(first(pcCase.maxGpuLengthMM, pcCase.maxGpuLengthMm, pcCase.gpuClearanceMm));
    if (gpuLength == null || maxGpuLength == null) checks.push(unknown('gpu-clearance', 'Catalog chưa đủ chiều dài GPU và khoảng trống GPU tối đa của case.'));
    else checks.push(gpuLength <= maxGpuLength ? compatible('gpu-clearance', `GPU ${gpuLength} mm; case hỗ trợ tối đa ${maxGpuLength} mm.`) : incompatible('gpu-clearance', `GPU ${gpuLength} mm vượt khoảng trống ${maxGpuLength} mm của case.`));
  }

  if (parts.cooler && parts.case) {
    const radiator = number(first(cooler.radiatorSizeMM, cooler.radiatorSizeMm));
    if (radiator != null) {
      const supportedRadiators = list(first(pcCase.radiatorSupport, pcCase.radiatorSizesMM, pcCase.radiatorSizesMm)).map(number).filter((item) => item != null);
      if (!supportedRadiators.length) checks.push(unknown('radiator-clearance', 'Chưa có kích thước radiator được case hỗ trợ.'));
      else checks.push(supportedRadiators.includes(radiator) ? compatible('radiator-clearance', `Case ghi hỗ trợ radiator ${radiator} mm.`) : incompatible('radiator-clearance', `Case không ghi hỗ trợ radiator ${radiator} mm.`));
    } else {
      const coolerHeight = number(first(cooler.coolerHeightMM, cooler.heightMm, cooler.height));
      const maxCoolerHeight = number(first(pcCase.maxCoolerHeightMM, pcCase.maxCoolerHeightMm));
      if (coolerHeight == null || maxCoolerHeight == null) checks.push(unknown('cooler-clearance', 'Catalog chưa đủ chiều cao tản khí và giới hạn của case.'));
      else checks.push(coolerHeight <= maxCoolerHeight ? compatible('cooler-clearance', `Tản nhiệt ${coolerHeight} mm; case hỗ trợ tối đa ${maxCoolerHeight} mm.`) : incompatible('cooler-clearance', `Tản nhiệt ${coolerHeight} mm vượt giới hạn ${maxCoolerHeight} mm của case.`));
    }
  }

  if (parts.psu && parts.cpu && parts.gpu) {
    const capacity = number(first(psu.wattageW, psu.power, psu.wattage));
    const cpuTdp = number(first(cpu.tdpW, cpu.defaultTDP, cpu.tdp));
    const gpuTdp = number(first(gpu.powerDrawW, gpu.powerDraw, gpu.totalBoardPowerW, gpu.totalBoardPower, gpu.tdp));
    if (capacity == null || cpuTdp == null || gpuTdp == null) checks.push(unknown('power-budget', 'Chưa đủ công suất PSU, TDP CPU và mức tiêu thụ GPU để xác minh dự phòng nguồn.'));
    else {
      const estimatedLoad = Math.ceil((cpuTdp + gpuTdp + 100) * 1.25);
      checks.push(capacity >= estimatedLoad ? compatible('power-budget', `Mức PSU ${capacity} W đạt ước tính tải ${estimatedLoad} W (CPU + GPU + 100 W và 25% dự phòng).`) : incompatible('power-budget', `PSU ${capacity} W thấp hơn mức tham khảo ${estimatedLoad} W gồm dự phòng 25%.`));
    }
  }

  if (parts.psu && parts.gpu) {
    const connectors = connectorCompatible(first(gpu.powerConnectors, gpu.powerConnector), first(psu.gpuConnectors, psu.pcieConnectors, psu.connectors?.gpu));
    if (connectors == null) checks.push(unknown('gpu-power-connector', 'Catalog chưa ghi đủ loại và số lượng đầu cấp nguồn GPU/PSU.'));
    else checks.push(connectors ? compatible('gpu-power-connector', 'Số lượng và loại đầu cấp nguồn GPU có trong dữ liệu PSU.') : incompatible('gpu-power-connector', 'Dữ liệu đầu cấp nguồn PSU không đáp ứng đầu nối GPU đã ghi.'));
  }

  if (parts.fan && parts.case) {
    const fanSize = number(first(fan.sizeMM, fan.fanSizeMm, fan.size));
    const supportedFans = list(first(pcCase.fanSupport, pcCase.fanSizesMM, pcCase.fanSizesMm));
    if (fanSize == null || !supportedFans.length) checks.push(unknown('fan-mount', 'Chưa đủ kích thước quạt hoặc các vị trí quạt case hỗ trợ.'));
    else {
      const matchingMount = supportedFans.find((entry) => new RegExp(`(?:^|\\D)${fanSize}(?:\\D|$)`).test(String(entry)));
      checks.push(matchingMount ? compatible('fan-mount', `Case có vị trí lắp quạt ${fanSize} mm.`) : incompatible('fan-mount', `Case không ghi vị trí lắp quạt ${fanSize} mm.`));
    }
  }

  const missing = requiredSlots.filter((slot) => !parts[slot]);
  const hasConflict = checks.some(({ status }) => status === 'INCOMPATIBLE');
  const hasUnknown = checks.some(({ status }) => status === 'UNKNOWN');
  const status = hasConflict ? 'incompatible' : missing.length ? 'incomplete' : hasUnknown ? 'unverified' : 'compatible';
  return {
    status,
    verifiedCompatible: status === 'compatible',
    missing,
    checks,
    message: status === 'compatible'
      ? 'Các phép kiểm tra có đủ dữ liệu trong catalog đều đạt.'
      : hasConflict
        ? 'Có linh kiện xung đột theo thông số đã ghi trong catalog.'
        : missing.length
          ? `Cấu hình chưa đủ linh kiện: ${missing.join(', ')}.`
          : 'Cấu hình còn điều kiện tương thích chưa được xác minh; hãy kiểm tra các cảnh báo bên dưới.',
  };
}

export function isBuildVerifiedCompatible(parts) {
  return getBuildCompatibility(parts).verifiedCompatible;
}

export const PC_BUILD_SLOTS = Object.freeze(requiredSlots);
