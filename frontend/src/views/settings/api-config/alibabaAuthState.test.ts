import * as assert from 'node:assert/strict';
import { hasUsableAlibabaToken } from './alibabaAuthState';

assert.equal(hasUsableAlibabaToken({ hasToken: true, isExpired: false }), true);
assert.equal(hasUsableAlibabaToken({ hasToken: true, isExpired: true }), false);
assert.equal(hasUsableAlibabaToken({ hasToken: false, isExpired: false }), false);
assert.equal(hasUsableAlibabaToken(null), false);
assert.equal(hasUsableAlibabaToken(undefined), false);

console.log('alibaba auth state assertions passed');
