import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const accountInfo = fs.readFileSync(
  path.join(root, 'frontend/src/views/settings/account-info/Index.vue'),
  'utf8'
);

assert.match(
  accountInfo,
  /<form\s+@submit\.prevent="handleEditSubmit"/,
  'account edit modal should submit through handleEditSubmit'
);

const confirmButton =
  accountInfo.match(/<el-button[^>]*btn-confirm[^>]*>[\s\S]*?提交[\s\S]*?<\/el-button>/)?.[0] || '';

assert.match(confirmButton, /type="primary"/, 'account edit confirm button should keep primary styling');
assert.match(confirmButton, /native-type="submit"/, 'account edit confirm button should be a native submit button');

console.log('accountInfoSubmitButton.test passed');
