import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/views/source-collection/product-collection/components/SimilarProductsDrawer.vue', 'utf8');

const searchLoadingBlock = source.match(/<div v-else-if="isSearching" class="search-loading-container">[\s\S]*?<\/div>\s*\n\s*<!-- 无结果 -->/)?.[0] || '';

assert.ok(searchLoadingBlock, '需要保留搜同款/搜同类的搜索中状态');
assert.doesNotMatch(searchLoadingBlock, /AppSkeletonLoader/, '搜同款/搜同类是搜索动画，不应使用骨架加载动画');
assert.match(source, /class="search-orbit-loader"/, '搜索态需要专用搜索动画容器');
assert.match(source, /class="search-progress-track"/, '搜索态需要短进度条');
assert.match(source, /class="search-progress-fill"/, '搜索态需要进度条扫光层');
assert.match(source, /@keyframes\s+searchOrbitSpin/, '搜索态需要旋转搜索动画');
assert.match(source, /@keyframes\s+searchPulseDot/, '搜索态需要脉冲点动画');
assert.match(source, /@keyframes\s+searchProgressSweep/, '搜索态进度条需要扫光动画');
assert.match(source, /class="load-more-dots"/, '无限下滑加载动画需要保留');

console.log('similarProductsSearchAnimation.test passed');
