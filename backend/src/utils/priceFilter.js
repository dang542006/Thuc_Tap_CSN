import { AppError } from './AppError.js';

const INVALID_PRICE_FILTER = 'Giá lọc phải là số tiền hợp lệ, không âm.';
const GROUPED_INTEGER = /^\d{1,3}(?:[.,]\d{3})+$/;

function invalidPrice() {
  return new AppError(INVALID_PRICE_FILTER, 422, 'INVALID_PRICE_FILTER');
}

function normalizeIntegerPart(value, groupingSeparator) {
  if (/^\d+$/.test(value)) return value;
  if (!groupingSeparator) throw invalidPrice();

  const groups = value.split(groupingSeparator);
  if (!/^\d{1,3}$/.test(groups[0]) || groups.slice(1).some((group) => !/^\d{3}$/.test(group))) {
    throw invalidPrice();
  }
  return groups.join('');
}

/**
 * Parse query-string money values without treating Vietnamese grouping dots
 * (for example, "100.000") as decimal points. Empty values stay unbounded.
 */
export function parsePriceFilter(input) {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== 'string' && typeof input !== 'number') throw invalidPrice();

  let value = String(input).trim().replace(/[\s\u00a0\u202f]/g, '');
  if (!value) return undefined;
  value = value.replace(/^(?:₫|VNĐ|VND)/i, '').replace(/(?:₫|VNĐ|VND)$/i, '');
  if (!value || !/^\d+(?:[.,]\d+)*$/.test(value)) throw invalidPrice();

  const hasDot = value.includes('.');
  const hasComma = value.includes(',');
  let normalized;

  if (hasDot && hasComma) {
    const decimalSeparator = value.lastIndexOf('.') > value.lastIndexOf(',') ? '.' : ',';
    const groupingSeparator = decimalSeparator === '.' ? ',' : '.';
    const decimalIndex = value.lastIndexOf(decimalSeparator);
    const integerPart = value.slice(0, decimalIndex);
    const fractionalPart = value.slice(decimalIndex + 1);
    if (!/^\d+$/.test(fractionalPart) || fractionalPart.length > 2) throw invalidPrice();
    normalized = `${normalizeIntegerPart(integerPart, groupingSeparator)}.${fractionalPart}`;
  } else if (hasDot || hasComma) {
    if (GROUPED_INTEGER.test(value)) {
      normalized = value.replace(/[.,]/g, '');
    } else {
      const separator = hasDot ? '.' : ',';
      const parts = value.split(separator);
      if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) {
        throw invalidPrice();
      }
      normalized = `${parts[0]}.${parts[1]}`;
    }
  } else {
    normalized = value;
  }

  const price = Number(normalized);
  if (!Number.isFinite(price) || price < 0) throw invalidPrice();
  return price;
}
