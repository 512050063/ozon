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
  assert.match(source, /def should_retry_headed\(error: Exception\)/, `${scriptPath} should only retry headed for known Ozon blocking errors`);
  assert.match(source, /headless_mode(?:\: bool)? = True/, `${scriptPath} should default to headless mode`);
  assert.match(source, /headless_mode=False/, `${scriptPath} should keep a headed fallback for confirmed blocking errors`);
  assert.doesNotMatch(source, /headless_mode = not has_graphic_display\(\)/, `${scriptPath} should not prefer headed mode just because a display exists`);
}
