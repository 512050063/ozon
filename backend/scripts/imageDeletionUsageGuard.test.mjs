import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');
const controller = fs.readFileSync(path.join(root, 'backend/src/controllers/imageController.ts'), 'utf8');

assert.match(
  controller,
  /const\s+usedReference\s*=\s*await\s+prisma\.imageReference\.findFirst\([\s\S]*imageId[\s\S]*userId[\s\S]*\)/,
  'deleteImage should check image references before deleting',
);
assert.match(
  controller,
  /message:\s*'图片正在使用，禁止删除'/,
  'deleteImage should reject deletion when the image is used',
);
assert.match(
  controller,
  /const\s+usedImages\s*=\s*await\s+prisma\.imageReference\.findMany\([\s\S]*imageId:\s*\{\s*in:\s*images\.map\(image\s*=>\s*image\.id\)\s*\}/,
  'batchDeleteImages should check image references before deleting files',
);
assert.match(
  controller,
  /message:\s*'存在正在使用的图片，禁止批量删除'/,
  'batchDeleteImages should reject deletion when any image is used',
);

console.log('imageDeletionUsageGuard test passed');
