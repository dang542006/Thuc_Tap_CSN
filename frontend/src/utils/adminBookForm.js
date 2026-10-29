export const bookFormFields = ['title', 'brand', 'categoryId', 'price', 'discountPrice', 'stock', 'description', 'specifications', 'optionGroups', 'status'];

export function createBookForm(book = {}) {
  book ??= {};
  return Object.fromEntries(bookFormFields.map((key) => [key, key === 'specifications'
    ? book[key] ? JSON.stringify(book[key], null, 2) : ''
    : key === 'optionGroups'
      ? JSON.stringify((book.optionGroups ?? []).map(({ groupName, maxChoose, required, items }) => ({ groupName, maxChoose, required, items: (items ?? []).map(({ optionName, extraCost }) => ({ optionName, extraCost: Number(extraCost) })) })), null, 2)
    : book[key] == null ? '' : String(book[key])]));
}

function numberValue(value, label, integer = false) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`Vui lòng nhập ${label.toLowerCase()}.`);
  const normalized = /^\d{1,3}(?:\.\d{3})+$/.test(text) ? text.replace(/\./g, '') : text.replace(',', '.');
  if (!(integer ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/).test(normalized)) throw new Error(`${label} phải là số ${integer ? 'nguyên ' : ''}không âm hợp lệ.`);
  const result = Number(normalized);
  if (!Number.isFinite(result) || result > (integer ? 2147483647 : 99999999.99)) throw new Error(`${label} vượt quá giới hạn cho phép.`);
  return result;
}

export function buildBookPayload(form, original) {
  const baseline = createBookForm(original);
  const payload = {};
  for (const key of bookFormFields) {
    if (original && String(form[key] ?? '') === baseline[key]) continue;
    const value = String(form[key] ?? '').trim();
    if (key === 'price') payload[key] = numberValue(value, 'Giá');
    else if (key === 'stock') payload[key] = numberValue(value, 'Tồn kho', true);
    else if (key === 'discountPrice') payload[key] = value === '' ? null : numberValue(value, 'Giá ưu đãi');
    else if (key === 'specifications') {
      if (!value) payload[key] = null;
      else {
        try {
          const parsed = JSON.parse(value);
          if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' || Object.values(parsed).some((item) => !['string', 'number', 'boolean'].includes(typeof item))) throw new Error();
          payload[key] = parsed;
        } catch { throw new Error('Thông số kỹ thuật cần là JSON dạng {"CPU":"...", "RAM":"..."}.'); }
      }
    }
    else if (key === 'optionGroups') {
      if (!value) payload[key] = [];
      else {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed) || parsed.some((group) => !group || typeof group.groupName !== 'string' || !group.groupName.trim() || !Number.isInteger(Number(group.maxChoose)) || Number(group.maxChoose) < 1 || typeof group.required !== 'boolean' || !Array.isArray(group.items) || group.items.length === 0 || Number(group.maxChoose) > group.items.length || group.items.some((item) => !item || typeof item.optionName !== 'string' || !item.optionName.trim() || !Number.isFinite(Number(item.extraCost ?? 0)) || Number(item.extraCost ?? 0) < 0))) throw new Error();
          payload[key] = parsed.map((group) => ({ ...group, maxChoose: Number(group.maxChoose), items: group.items.map((item) => ({ optionName: item.optionName.trim(), extraCost: Number(item.extraCost ?? 0) })) }));
        } catch { throw new Error('Nhóm tùy chọn cần là JSON gồm groupName, maxChoose, required và items.'); }
      }
    }
    else if (key === 'status') { if (value) payload[key] = value; }
    else payload[key] = value;
  }
  const price = payload.price ?? Number(original?.price);
  const discount = Object.hasOwn(payload, 'discountPrice') ? payload.discountPrice : original?.discountPrice;
  if (discount != null && Number(discount) > 0 && Number(discount) >= price) throw new Error('Giá ưu đãi phải thấp hơn giá gốc.');
  return payload;
}
