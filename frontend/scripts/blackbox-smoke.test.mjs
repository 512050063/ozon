import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('../../backend/node_modules/playwright');

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
const consoleErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text();
    if (!text.includes('409 (Conflict)')) {
      consoleErrors.push(text);
    }
  }
});

try {
  await page.goto(`${baseURL}/auth`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await completeLogin(page);

  await page.evaluate(() => {
    localStorage.removeItem('pa_search_keyword');
    localStorage.removeItem('pa_category_path');
    localStorage.removeItem('pa_extract_state');
    localStorage.removeItem('ozon_preference_search_progress');
  });

  await page.goto(`${baseURL}/product-analysis/ozon-preference`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => document.body.innerText.includes('暂无产品')
      && !!document.querySelector('.preference-product-table')
      && !!document.querySelector('.preference-results-area'),
    null,
    { timeout: 20000 },
  );

  const ozonPreferenceState = await page.evaluate(() => {
    const wrapper = document.querySelector('.preference-product-table');
    const resultArea = document.querySelector('.preference-results-area');
    const searchButton = [...document.querySelectorAll('button')]
      .find(button => button.innerText.trim() === '搜索');

    const rect = element => {
      const box = element.getBoundingClientRect();
      return { height: Math.round(box.height), width: Math.round(box.width) };
    };

    return {
      searchDisabled: searchButton?.disabled,
      hasFillEmptyClass: wrapper?.classList.contains('app-table-wrapper--fill-empty'),
      wrapper: wrapper ? rect(wrapper) : null,
      resultArea: resultArea ? rect(resultArea) : null,
      bodyText: document.body.innerText,
    };
  });

  assert.equal(
    ozonPreferenceState.searchDisabled,
    true,
    'Ozon preference search should be disabled when keyword/category are empty',
  );
  assert.equal(
    ozonPreferenceState.hasFillEmptyClass,
    true,
    'Ozon preference empty table should call global fill-empty style',
  );
  assert.ok(ozonPreferenceState.wrapper, 'Ozon preference table wrapper should render');
  assert.ok(ozonPreferenceState.resultArea, 'Ozon preference result area should render');
  assert.ok(
    ozonPreferenceState.wrapper.height >= ozonPreferenceState.resultArea.height - 2,
    'empty table should fill result area',
  );
  assert.match(ozonPreferenceState.bodyText, /暂无产品/, 'empty product copy should render');
  assert.deepEqual(consoleErrors, [], 'black-box smoke should not produce blocking console errors');

  console.log('blackbox smoke tests passed');
} finally {
  await browser.close();
}

async function completeLogin(page) {
  const continueLoginButton = page.getByRole('button', { name: '继续登录', exact: true });
  const result = await Promise.race([
    page.waitForFunction(() => !window.location.pathname.includes('/auth'), null, { timeout: 20000 }).then(() => 'logged-in'),
    continueLoginButton.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'active-session').catch(() => 'pending'),
  ]);

  if (result === 'active-session') {
    await continueLoginButton.click();
  }

  await page.waitForFunction(() => !window.location.pathname.includes('/auth'), null, { timeout: 20000 });
}
