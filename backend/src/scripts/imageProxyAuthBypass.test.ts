import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appSource = fs.readFileSync(path.resolve(__dirname, '../app.ts'), 'utf8');

assert.match(
  appSource,
  /req\.path === ['"]\/images\/proxy['"]/,
  'Ozon image proxy must bypass API auth because browser img requests cannot send Authorization headers'
);
