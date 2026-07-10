const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.resolve(__dirname, 'ozon/ozon_product_by_url.py');
const source = fs.readFileSync(scriptPath, 'utf8');

assert.match(source, /from playwright\.sync_api import sync_playwright/);
assert.doesNotMatch(source, /rebrowser_playwright/);
assert.match(source, /def infer_type_from_text/);
assert.match(source, /def build_minimal_product_from_url/);

console.log('ozon product by url script assertions passed');
