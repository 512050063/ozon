import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const source = fs.readFileSync(path.resolve(path.dirname(__filename), 'imageUrl.ts'), 'utf8');

assert.match(source, /toDisplayImageUrl/, 'image URL helper should expose toDisplayImageUrl');
assert.match(source, /\/api\/images\/proxy\?url=/, 'remote Ozon images should be routed through API image proxy');
assert.match(source, /ozon/i, 'helper should identify Ozon image URLs');
assert.match(source, /alicdn/i, 'helper should route Alibaba CDN images through API image proxy');
assert.match(source, /isLegacyImageHostUrl/, 'helper should identify legacy imagehost URLs');
assert.match(source, /LEGACY_IMAGE_HOST_PATH_PATTERN/, 'legacy imagehost path should be blocked from display');
