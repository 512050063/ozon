import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync('src/views/dashboard/Index.vue', 'utf8');

assert.doesNotMatch(dashboard, /<h2 class="overview-title">主页信息<\/h2>/, '主页顶部不应再显示旧标题');
assert.doesNotMatch(dashboard, /聚合商品、店铺、订单和同步状态，快速判断当前运营情况/, '主页顶部不应再显示旧副标题');
assert.match(dashboard, /greeting-card/, '主页顶部需要使用问候信息块');
assert.match(dashboard, /{{\s*dashboardGreeting\.period\s*}}/, '问候块需要显示上午好/下午好等时段问候');
assert.match(dashboard, /{{\s*dashboardGreeting\.dateText\s*}}/, '问候块需要显示日期和星期');
assert.match(dashboard, /{{\s*dashboardGreeting\.quote\s*}}/, '问候块需要显示激励短句');
assert.match(dashboard, /dashboardGreeting\.icon/, '问候块需要使用动态图标');
assert.match(dashboard, /const dashboardGreeting = computed/, '问候内容需要按当前时间动态计算');
assert.match(dashboard, /\.greeting-sun/, '太阳图标需要独立视觉样式');
assert.match(dashboard, /\.greeting-card[\s\S]*width:\s*100%/, '问候块需要撑满左侧内容区，避免右侧空白');
assert.doesNotMatch(dashboard, /\.greeting-card[\s\S]{0,360}border:/, '问候块不应再使用外边框');
assert.match(dashboard, /greeting-weather/, '问候块需要太阳云彩插画容器');
assert.match(dashboard, /\.greeting-cloud/, '问候块需要云彩图形样式');

console.log('dashboardGreeting.test passed');
