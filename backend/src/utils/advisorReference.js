import { normalizeText } from './advisorQuery.js';

const clean = (value) => normalizeText(value).replace(/[“”"‘’]/g, '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '').trim();
const compactIsbn = (value) => value.replace(/[\s\-\u2010-\u2015]/g, '').toUpperCase();

export function resolveAdvisorReference(message, catalog, categories) {
  const text = clean(message);
  const isbnMatch = text.match(/(?:^|\s|:)((?:97[89][\s-]*)?\d(?:[\s-]*\d){8}[\s-]*[\dx])(?:$|[\s?!.,])/i);
  const explicit = /(?:isbn|ma sach|ten sach)\s*[:：]?\s*(.+?)(?:\s+(?:nhe|nha|giup toi|duoc khong))?[?!.]*$/.exec(text);
  const reference = (isbnMatch?.[1] || explicit?.[1] || text
    .replace(/^(?:toi|minh|em|ban)\s+(?:muon\s+)?(?:mua|tim|can|co)\s+/, '')
    .replace(/^(?:tim|mua|cho toi|cho minh)\s+/, '')
    .replace(/^(?:mot|1)\s+/, '').replace(/^(?:cuon\s+)?sach\s+/, '')
    .replace(/\s+(?:nhe|nha|giup toi|duoc khong|khong)[?!.]*$/, '')).trim();
  const isbn = compactIsbn(reference);
  const exact = catalog.find((book) => clean(book.id) === reference || clean(book.slug) === reference || clean(book.title) === reference || (book.isbn && compactIsbn(book.isbn) === isbn));
  if (exact) return { isLookup: true, bookId: exact.id, reference };
  // A full title mentioned in a sentence is still an explicit book request.
  const mentioned = catalog.filter((book) => text.includes(clean(book.title))).sort((a, b) => b.title.length - a.title.length)[0];
  if (mentioned && !explicit && !isbnMatch) return { isLookup: true, bookId: mentioned.id, reference: mentioned.title };
  if (explicit || isbnMatch) return { isLookup: true, reference };
  const category = categories.some(({ name }) => clean(name).split(/\s*[&/]\s*/).some((part) => part.length > 2 && text.includes(part)));
  const isFilter = category || /\d.*(?:den|toi|[-–]).*\d/.test(text) || /\b(?:the loai|danh muc|ngan sach|gia|tam|khoang|duoi|tren|toi da|toi thieu|trieu|nghin|ngan)\b/.test(text) || /^\d+(?:[.,]\d+)*(?:\s*[kd])?$/.test(text);
  const greeting = /^(?:xin chao|chao|hello|hi|cam on|tu van|goi y)[!?.]*$/.test(text);
  return { isLookup: !isFilter && !greeting, reference };
}
