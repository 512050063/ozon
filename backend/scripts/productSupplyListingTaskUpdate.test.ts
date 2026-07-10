import assert from 'assert';
import { resolveProductSupplyListingTaskUpdate } from '../src/controllers/productSupplyController';

const importedWithError = resolveProductSupplyListingTaskUpdate({
  status: 'imported',
  items: [{
    status: 'imported',
    errors: [{
      level: 'error',
      message: 'Brand value is invalid',
      description: 'Brand value is invalid',
    }],
  }],
}, 'listing');

assert.equal(importedWithError.status, 'failed');
assert.match(importedWithError.listingError || '', /Brand value is invalid/);

const importedWithWarning = resolveProductSupplyListingTaskUpdate({
  status: 'imported',
  items: [{
    status: 'imported',
    errors: [{
      level: 'warning',
      message: 'Image warning',
    }],
  }],
}, 'listing');

assert.equal(importedWithWarning.status, 'listed');
assert.equal(importedWithWarning.listingError, null);

console.log('productSupplyListingTaskUpdate.test passed');
