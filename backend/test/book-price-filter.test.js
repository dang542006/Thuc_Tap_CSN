import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePriceFilter } from '../src/utils/priceFilter.js';

test('price filter parses Vietnamese thousands separators and preserves zero', () => {
  assert.equal(parsePriceFilter('100.000'), 100000);
  assert.equal(parsePriceFilter('1.250.000'), 1250000);
  assert.equal(parsePriceFilter('0'), 0);
  assert.equal(parsePriceFilter('0.000'), 0);
});

test('price filter supports optional bounds and decimal input', () => {
  assert.equal(parsePriceFilter(undefined), undefined);
  assert.equal(parsePriceFilter(''), undefined);
  assert.equal(parsePriceFilter('  '), undefined);
  assert.equal(parsePriceFilter('100.50'), 100.5);
  assert.equal(parsePriceFilter('1.234,50'), 1234.5);
  assert.equal(parsePriceFilter('1,234.50'), 1234.5);
});

test('price filter rejects malformed and negative values', () => {
  for (const value of ['-1', '100..000', '100,000,00', 'abc', '1.23.456']) {
    assert.throws(() => parsePriceFilter(value), { code: 'INVALID_PRICE_FILTER', statusCode: 422 });
  }
});
