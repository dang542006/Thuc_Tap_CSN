import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize } from '../src/middlewares/authorize.js';

test('ADMIN authorization rejects a CUSTOMER with 403', () => {
  let error;
  authorize('ADMIN')({ user: { id: 'customer-id', role: 'CUSTOMER' } }, {}, (nextError) => { error = nextError; });
  assert.equal(error?.statusCode, 403);
  assert.equal(error?.code, 'FORBIDDEN');
});

test('ADMIN authorization allows an ADMIN', () => {
  let nextCalled = false;
  authorize('ADMIN')({ user: { id: 'admin-id', role: 'ADMIN' } }, {}, (error) => {
    assert.equal(error, undefined);
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});
