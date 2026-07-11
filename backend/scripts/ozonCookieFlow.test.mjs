import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const cookieScript = fs.readFileSync(path.join(root, 'backend/scripts/ozon/ozon_cookie.py'), 'utf8');
const cookieService = fs.readFileSync(path.join(root, 'backend/src/services/ozonCookieService.ts'), 'utf8');

const mainMatch = cookieScript.match(/def main\(\):[\s\S]*?if __name__ == '__main__':/);
assert.ok(mainMatch, 'cookie script should expose a main flow');
const mainFlow = mainMatch[0];

assert.match(
  cookieScript,
  /def load_existing_cookie_data\(\):/,
  'cookie script should check the local cookie JSON before browser validation',
);
assert.match(
  cookieScript,
  /def validate_cookie_data\(data\):/,
  'cookie script should validate local cookie JSON completeness',
);
assert.match(
  mainFlow,
  /existing_cookie_data = load_existing_cookie_data\(\)[\s\S]*validate_cookie_data\(existing_cookie_data\)[\s\S]*apply_cookie_data\(context, existing_cookie_data\)/,
  'main flow should load, validate, and inject existing cookie JSON before visiting Ozon',
);
assert.match(
  mainFlow,
  /open_settings_popup\(page\)[\s\S]*select_language_and_currency\(page\)[\s\S]*click_save\(page\)/,
  'main flow should auto-open Ozon language/currency dropdowns when environment is not ready',
);
assert.match(
  mainFlow,
  /language_currency_not_ready/,
  'main flow should report language/currency environment errors directly',
);
assert.match(
  cookieScript,
  /def has_graphic_display\(\):/,
  'cookie script should detect whether a graphical display is available',
);
assert.match(
  mainFlow,
  /headless_mode = not has_graphic_display\(\)/,
  'main flow should switch to headless mode when no display is available',
);
assert.match(
  mainFlow,
  /launch_chrome\(headless=headless_mode\)/,
  'main flow should pass the headless flag into Chrome launch',
);
assert.doesNotMatch(
  cookieService,
  /requiredCookies\s*=\s*\['session_key'\]/,
  'backend cookie validation should not require the obsolete session_key cookie',
);

console.log('ozonCookieFlow.test passed');
