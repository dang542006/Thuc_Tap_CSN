export const normalizeText = (text) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const amountPattern = '(\\d+(?:[.,]\\d+)*)(?:\\s*(trieu|tr|nghin|ngan|k|vnd|vndong|dong|d))?';
function amount(number, unit) {
  const grouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(number);
  const value = Number(grouped ? number.replace(/[.,]/g, '') : number.replace(',', '.'));
  return Math.round(value * (/^(trieu|tr)$/.test(unit || '') ? 1000000 : /^(nghin|ngan|k)$/.test(unit || '') ? 1000 : 1));
}

export function parseAdvisorQuery(messages, categories) {
  let category;
  let minPrice;
  let maxPrice;
  let approximate = false;
  let unknownCategory = false;
  for (const message of messages) {
    const text = normalizeText(message);
    const matched = categories.find((item) => normalizeText(item.name).split(/\s*[&/]\s*/).some((name) => name.length > 2 && text.includes(name)));
    if (matched) { category = matched; unknownCategory = false; }
    else if (/the loai|danh muc|sach ve/.test(text)) { category = undefined; unknownCategory = true; }
    if (/bat ky the loai|moi the loai|tat ca the loai/.test(text)) { category = undefined; unknownCategory = false; }
    if (/khong gioi han gia|bo loc gia/.test(text)) { minPrice = undefined; maxPrice = undefined; approximate = false; continue; }
    const range = text.match(new RegExp(`(?:tu\\s+)?${amountPattern}\\s*(?:den|toi|[-–])\\s*${amountPattern}`));
    if (range) {
      minPrice = amount(range[1], range[2] || (amount(range[1]) < 1000 ? range[4] : undefined));
      maxPrice = amount(range[3], range[4] || (amount(range[3]) < 1000 ? range[2] : undefined));
      approximate = false;
      continue;
    }
    const values = [...text.matchAll(new RegExp(amountPattern + '(?![a-z])', 'g'))];
    const price = values.find((entry) => entry[2] || amount(entry[1]) >= 1000 || /(?:gia|duoi|tren|tam|khoang|toi da|toi thieu)\s*$/.test(text.slice(0, entry.index)));
    if (!price) continue;
    const value = amount(price[1], price[2]);
    const before = text.slice(0, price.index);
    approximate = /(?:tam|khoang|xap xi)\s*$/.test(before);
    if (approximate) { minPrice = Math.round(value * .8); maxPrice = Math.round(value * 1.2); }
    else if (/(?:duoi|khong qua|toi da|ngan sach|den|toi)\s*$/.test(before)) { minPrice = undefined; maxPrice = value; }
    else if (/(?:tren|tu|toi thieu)\s*$/.test(before)) { minPrice = value; maxPrice = undefined; }
    else { minPrice = value; maxPrice = value; }
  }
  return { category, minPrice, maxPrice, approximate, unknownCategory };
}
