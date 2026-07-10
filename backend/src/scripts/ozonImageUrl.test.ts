import assert from 'node:assert/strict';
import { normalizeOzonImageUrlForDisplay } from '../utils/ozonImageUrl';

assert.equal(
  normalizeOzonImageUrlForDisplay('https://cdn1.ozon.ru/s3/multimedia-1-x/10023917577.jpg'),
  'https://ir-21.ozonru.cn/s3/multimedia-1-x/10023917577.jpg',
);

assert.equal(
  normalizeOzonImageUrlForDisplay('https://ir-21.ozonru.cn/s3/multimedia-1-l/10310922993.jpg'),
  'https://ir-21.ozonru.cn/s3/multimedia-1-l/10310922993.jpg',
);

assert.equal(
  normalizeOzonImageUrlForDisplay({ fileUrl: 'https://cdn2.ozon.ru/s3/test/image.jpg' }),
  'https://ir-21.ozonru.cn/s3/test/image.jpg',
);

assert.equal(normalizeOzonImageUrlForDisplay('/images/local.jpg'), '/images/local.jpg');
assert.equal(normalizeOzonImageUrlForDisplay(''), '');

console.log('ozon image url assertions passed');
