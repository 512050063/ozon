import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('../../backend/node_modules/playwright');

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

const routes = [
  { path: '/dashboard', text: /主页|仪表|数据|订单|商品/ },
  { path: '/product-analysis/ozon-preference', text: /ozon 优选|暂无产品|搜索/ },
  { path: '/product-analysis/bidding-monitor', text: /竞价监控|策略|价格/ },
  { path: '/source-collection/product-collection', text: /商品采集|货源采集|搜索/ },
  { path: '/source-collection/supply-management', text: /货源管理|货源/ },
  { path: '/warehouse/product-library', text: /商品库|本地仓库|上架/ },
  { path: '/warehouse/material-library', text: /素材库|图片|素材/ },
  { path: '/ozon/store-management', text: /店铺管理|Ozon店铺|店铺/ },
  { path: '/ozon/product-management', text: /商品管理|Ozon商品|商品/ },
  { path: '/ozon/order-management', text: /订单管理|订单/ },
  { path: '/ozon/promotions', text: /促销活动|活动管理|Ozon店铺/ },
  { path: '/ozon/finance-report', text: /财务|报表|统计/ },
  { path: '/ozon/pricing', text: /定价|策略|价格/ },
  { path: '/customer-service', text: /自动回复|智能客服|关键词/ },
  { path: '/customer-service/messages', text: /消息中心|消息列表|买家|客服/ },
  { path: '/settings/account-info', text: /账号信息|个人信息|账号/ },
  { path: '/settings/role-management', text: /角色管理|角色/ },
  { path: '/settings/api-config', text: /API配置|Ozon配置|配置/ },
  { path: '/settings/user-management', text: /用户管理|用户/ },
  { path: '/settings/payment-records', text: /充值记录|支付记录|记录/ },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });

const blockingConsoleErrors = [];
const pageErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text();
    if (!text.includes('409 (Conflict)')) {
      blockingConsoleErrors.push(`${page.url()} :: ${text}`);
    }
  }
});

page.on('pageerror', error => {
  pageErrors.push(`${page.url()} :: ${error.message}`);
});

try {
  await page.goto(`${baseURL}/auth`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await completeLogin(page);

  const results = [];

  for (const route of routes) {
    await gotoWithRetry(page, route);

    const state = await page.evaluate(() => {
      const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim();
      const main = document.querySelector('main, .main-content, .page-content, .content') || document.body;
      const box = main.getBoundingClientRect();
      const visibleFatalError = /Cannot read properties|Unhandled|ReferenceError|TypeError|SyntaxError/i.test(bodyText);

      return {
        bodyText,
        currentPath: window.location.pathname,
        mainHeight: Math.round(box.height),
        hasFatalErrorText: visibleFatalError,
      };
    });

    assert.equal(
      state.currentPath,
      route.path,
      `${route.path} should not redirect to another route`,
    );
    assert.match(state.bodyText, route.text, `${route.path} should render expected page text`);
    assert.ok(state.mainHeight > 120, `${route.path} should render a meaningful content area`);
    assert.equal(state.hasFatalErrorText, false, `${route.path} should not render fatal frontend error text`);

    results.push({
      path: route.path,
      mainHeight: state.mainHeight,
      text: state.bodyText.slice(0, 80),
    });
  }

  assert.deepEqual(pageErrors, [], 'route matrix should not produce page errors');
  assert.deepEqual(blockingConsoleErrors, [], 'route matrix should not produce console errors');

  console.log(`blackbox route matrix passed (${results.length} route(s))`);
} finally {
  await browser.close();
}

async function gotoWithRetry(page, route) {
  const url = `${baseURL}${route.path}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (error) {
    if (!String(error?.message || error).includes('ERR_NETWORK_IO_SUSPENDED')) {
      throw error;
    }
    await page.waitForTimeout(500);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  await page.waitForFunction(
    ({ path, source, flags }) => {
      const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim();
      const main = document.querySelector('main, .main-content, .page-content, .content') || document.body;
      const box = main.getBoundingClientRect();
      return window.location.pathname === path && new RegExp(source, flags).test(bodyText) && box.height > 120;
    },
    { path: route.path, source: route.text.source, flags: route.text.flags },
    { timeout: 20000 },
  );
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
