import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

process.env.PUBLIC_BASE_URL = 'https://example.com/app/';
process.env.NODE_ENV = 'production';

const modulePath = path.resolve('../backend/dist/services/publicAssetUrlService.js');
const resolvedModuleUrl = pathToFileURL(modulePath).href;
const service = await import(resolvedModuleUrl);

assert.equal(
  service.resolvePublicAssetUrl('/uploads/images/a.jpg'),
  'https://example.com/uploads/images/a.jpg',
);
assert.equal(
  service.resolvePublicAssetUrl('/images/old.jpg'),
  'https://example.com/images/old.jpg',
);
assert.equal(
  service.resolvePublicAssetUrl('https://cdn.example.com/x.jpg'),
  'https://cdn.example.com/x.jpg',
);
assert.throws(
  () => service.resolvePublicAssetUrl('/uploads/images/a.jpg', { publicBaseUrl: '' }),
  /PUBLIC_BASE_URL 未配置/,
);
assert.throws(
  () => service.resolvePublicAssetUrl('/uploads/images/a.jpg', { publicBaseUrl: 'http://example.com', requireHttps: true }),
  /HTTPS/,
);

console.log('publicAssetUrlService tests passed');
