import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const scripts = [
  'backend/scripts/ozon/ozon_search.py',
  'backend/scripts/ozon/ozon_product_by_url.py',
  'backend/scripts/ozon/ozon_extract_type_batch.py',
];

for (const scriptPath of scripts) {
  const source = fs.readFileSync(path.join(root, scriptPath), 'utf8');
  assert.match(source, /def has_graphic_display\(/, `${scriptPath} should detect whether a display is available`);
  assert.match(source, /headless_mode = not has_graphic_display\(\)/, `${scriptPath} should only use headless without a display`);
  assert.doesNotMatch(source, /launch_args = \{'headless': True\}/, `${scriptPath} should not force headless mode`);
}
