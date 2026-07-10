import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'src');
const files = [];

const walk = dir => {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (/\.(vue|ts|js|tsx|jsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
};

walk(root);

const offenders = files
  .map(file => ({ file, source: readFileSync(file, 'utf8') }))
  .filter(({ source }) => /ElNotification\b|Notification\s*\(/.test(source))
  .map(({ file }) => file.replace(process.cwd() + '\\', '').replaceAll('\\', '/'));

assert.deepEqual(offenders, [], `Element Plus Notification should be replaced by ElMessage:\n${offenders.join('\n')}`);

console.log('noElementNotification checks passed');
