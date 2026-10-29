import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductHighlights } from './productHighlights.js';

test('highlights prioritize useful computer specifications without exposing the raw object', () => {
  assert.deepEqual(getProductHighlights({
    memory: 'DDR5', socket: 'AM5', maxBoost: '5.1 GHz', coresThreads: '6 nhân / 12 luồng',
  }, 2), [
    { label: 'Nhân / luồng', value: '6 nhân / 12 luồng' },
    { label: 'Bộ nhớ', value: 'DDR5' },
  ]);
});

test('JSON specifications can be rendered as bounded label/value highlights', () => {
  assert.deepEqual(getProductHighlights('{"GPU":"RTX 4060","memory":"8GB GDDR6"}', 1), [
    { label: 'GPU', value: 'RTX 4060' },
  ]);
});

test('invalid and non-object specifications do not produce raw output', () => {
  assert.deepEqual(getProductHighlights('[1,2]'), []);
  assert.deepEqual(getProductHighlights('{not-json'), []);
  assert.deepEqual(getProductHighlights(null), []);
});
