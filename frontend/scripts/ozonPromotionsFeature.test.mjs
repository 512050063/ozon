import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const backendServicePath = path.join(root, 'backend/src/services/ozonPromotionService.ts');
const backendControllerPath = path.join(root, 'backend/src/controllers/ozonPromotionController.ts');
const backendRoutesPath = path.join(root, 'backend/src/routes/ozonPromotionRoutes.ts');
const frontendApiPath = path.join(root, 'frontend/src/api/ozonPromotionAPI.ts');
const listPagePath = path.join(root, 'frontend/src/views/ozon/promotions/Index.vue');
const detailPagePath = path.join(root, 'frontend/src/views/ozon/promotions/products/Index.vue');
const addPagePath = path.join(root, 'frontend/src/views/ozon/promotions/add-products/Index.vue');
const detailDrawerPath = path.join(root, 'frontend/src/views/ozon/promotions/components/PromotionDetailDrawer.vue');
const productDetailDrawerPath = path.join(root, 'frontend/src/views/ozon/promotions/components/PromotionProductDetailDrawer.vue');
const addDrawerPath = path.join(root, 'frontend/src/views/ozon/promotions/components/PromotionAddProductsDrawer.vue');
const promotionTranslationPath = path.join(root, 'frontend/src/composables/usePromotionTextTranslations.ts');
const statCardPath = path.join(root, 'frontend/src/components/ui/StatCard.vue');
const detailDialogPath = path.join(root, 'frontend/src/components/ui/AppDetailDialog.vue');

for (const filePath of [backendServicePath, backendControllerPath, backendRoutesPath, frontendApiPath, listPagePath, detailPagePath, addPagePath, detailDrawerPath, addDrawerPath, promotionTranslationPath, statCardPath, detailDialogPath]) {
  assert.ok(fs.existsSync(filePath), `${path.relative(root, filePath)} should exist`);
}

const app = fs.readFileSync(path.join(root, 'backend/src/app.ts'), 'utf8');
const service = fs.readFileSync(backendServicePath, 'utf8');
const routes = fs.readFileSync(backendRoutesPath, 'utf8');
const api = fs.readFileSync(frontendApiPath, 'utf8');
const router = fs.readFileSync(path.join(root, 'frontend/src/router/index.ts'), 'utf8');
const listPage = fs.readFileSync(listPagePath, 'utf8');
const detailPage = [
  fs.readFileSync(detailPagePath, 'utf8'),
  fs.readFileSync(productDetailDrawerPath, 'utf8'),
].join('\n');
const addPage = fs.readFileSync(addPagePath, 'utf8');
const detailDrawer = fs.readFileSync(detailDrawerPath, 'utf8');
const addDrawer = fs.readFileSync(addDrawerPath, 'utf8');
const promotionTranslation = fs.readFileSync(promotionTranslationPath, 'utf8');
const statCard = fs.readFileSync(statCardPath, 'utf8');
const detailDialog = fs.readFileSync(detailDialogPath, 'utf8');

for (const endpoint of [
  'https://api-seller.ozon.ru/v1/actions',
  'https://api-seller.ozon.ru/v1/actions/products',
  'https://api-seller.ozon.ru/v1/actions/candidates',
  'https://api-seller.ozon.ru/v1/actions/products/activate',
  'https://api-seller.ozon.ru/v1/actions/products/deactivate',
]) {
  assert.match(service, new RegExp(endpoint.replace(/[/.]/g, '\\$&')), `service should call ${endpoint}`);
}

assert.match(app, /ozonPromotionRoutes/, 'backend app should import promotion routes');
assert.match(app, /app\.use\('\/api\/ozon\/promotions',\s*ozonPromotionRoutes\)/, 'backend app should mount promotion routes');
assert.match(routes, /authenticateToken/, 'promotion routes should require login');
assert.match(routes, /requirePermission\('ozon\/promotions'\)/, 'promotion routes should require direct promotions permission');
assert.match(routes, /router\.get\('\/:storeId'[\s\S]*getPromotions/, 'routes should expose promotion list');
assert.match(routes, /router\.get\('\/:storeId\/:actionId\/products'[\s\S]*getPromotionProducts/, 'routes should expose products in action');
assert.match(routes, /router\.get\('\/:storeId\/:actionId\/candidates'[\s\S]*getPromotionCandidates/, 'routes should expose candidates');
assert.match(routes, /router\.post\('\/:storeId\/:actionId\/products'[\s\S]*activatePromotionProduct/, 'routes should expose single add');
assert.match(routes, /router\.delete\('\/:storeId\/:actionId\/products\/:productId'[\s\S]*deactivatePromotionProduct/, 'routes should expose single remove');

assert.match(api, /getPromotions/, 'frontend API should fetch promotions');
assert.match(api, /getPromotionProducts/, 'frontend API should fetch promotion products');
assert.match(api, /getPromotionCandidates/, 'frontend API should fetch candidates');
assert.match(api, /activateProduct/, 'frontend API should add one product');
assert.match(api, /deactivateProduct/, 'frontend API should remove one product');

assert.match(router, /path:\s*'\/ozon\/promotions\/:actionId'/, 'router should define promotion products page');
assert.match(router, /path:\s*'\/ozon\/promotions\/:actionId\/add'/, 'router should define promotion add page');
assert.match(router, /menuKey:\s*'ozon\/promotions'/, 'promotion child pages should reuse promotions permission');

assert.match(listPage, /ozonPromotionAPI\.getPromotions/, 'list page should load promotions');
assert.match(listPage, /PromotionProducts/, 'list page should navigate to product management');
assert.match(detailPage, /ozonPromotionAPI\.getPromotionProducts/, 'detail page should load products');
assert.match(detailPage, /ozonPromotionAPI\.deactivateProduct/, 'detail page should remove a single product');
assert.match(detailPage, /useProductNameTranslations/, 'promotion product page should translate product names');
assert.match(detailPage, /resolveNames\(products\.value\.map\(row => row\.name\)/, 'promotion product page should resolve loaded product names');
assert.match(detailPage, /getTranslatedName\(row\.name\)/, 'promotion product page should render translated product names');
assert.match(detailPage, /promotion-products-header[\s\S]*promotion-status-tabs/, 'promotion product status tabs should live in the header area');
assert.match(detailPage, /promotion-status-tab[\s\S]*promotion-status-tab-count/, 'promotion product status switch should use Ozon-like text tabs with counts');
assert.match(detailPage, /plannedTabs/, 'promotion product page should build separate planned tabs');
assert.match(detailPage, /getPlannedTabCount/, 'promotion product page should not derive planned tab counts only from loaded product rows');
assert.match(detailPage, /parseQueryAutoAddPlanCounts/, 'promotion product page should accept planned auto-add counts when available');
assert.match(detailPage, /getPlannedTabUnavailableReason/, 'promotion product page should explain unavailable planned counts instead of guessing');
assert.doesNotMatch(detailPage, /getCandidateProductsCount/, 'promotion product page should not show activity-level candidate count as planned date tab count');
assert.match(detailPage, /isPlannedTabSelectable/, 'promotion product page should not switch to an empty planned tab without planned product rows');
assert.doesNotMatch(detailPage, /getDistributedPlannedCount/, 'promotion product page must not split total candidates into misleading planned counts');
assert.match(detailPage, /loadPromotionMeta/, 'promotion product page should fetch promotion metadata for planned auto-add dates');
assert.match(detailPage, /formatRawDateWithoutTimezoneShift/, 'promotion product activity dates should not drift because of local timezone');
assert.match(listPage, /autoAddDates:\s*JSON\.stringify\(getSortedAutoAddDates\(row\)\)/, 'promotion list should pass auto-add dates to product page');
assert.match(listPage, /autoAddPlanCounts:\s*JSON\.stringify\(getAutoAddPlanCounts\(row\)\)/, 'promotion list should pass auto-add plan counts to product page when available');
assert.doesNotMatch(listPage, /candidateProductsCount:\s*String\(row\.potential_products_count \|\| 0\)/, 'promotion list should not pass activity-level available product count for planned tab display');
assert.doesNotMatch(listPage, /potentialProductsCount:\s*String\(row\.potential_products_count \|\| 0\)/, 'promotion list should not pass total candidate count as planned-date count fallback');
assert.doesNotMatch(detailPage, /<div class="toolbar-actions">/, 'promotion product add button should not live in the title header');
assert.match(detailPage, /<template #header-index>序号<\/template>/, 'promotion product table should expose an index number column');
assert.match(detailPage, /<template #header-photo>照片<\/template>/, 'promotion product table should keep photo in a compact photo column');
assert.match(detailPage, /<template #header-sku>[\s\S]*货号[\s\S]*SKU/, 'promotion product table should show offer/SKU column');
assert.match(detailPage, /<template #header-product>[\s\S]*商品名称[\s\S]*类目/, 'promotion product table should show full product name heading');
assert.match(detailPage, /<template #header-ownPrice>[\s\S]*售价[\s\S]*底价/, 'promotion product table should shorten own and min price headings');
assert.match(detailPage, /<template #header-currentPromotion>[\s\S]*当前价[\s\S]*当前折扣/, 'promotion product table should shorten current promotion headings');
assert.match(detailPage, /<template #header-activityDiscount>[\s\S]*定价折扣[\s\S]*优惠额/, 'promotion product table should shorten activity discount headings');
assert.match(detailPage, /<template #header-promotionPrice>[\s\S]*活动价[\s\S]*促销提升/, 'promotion product table should combine promotion price and promotion lift');
assert.doesNotMatch(detailPage, /<el-radio-group/, 'promotion product participation switch should not use segmented radio styling');
assert.doesNotMatch(detailPage, /<el-radio-button/, 'promotion product participation switch should not use radio buttons');
assert.match(detailPage, /<AppTableButton name="detail"[\s\S]*tooltip="详情"/, 'promotion product operations should include detail button');
assert.match(detailPage, /<PromotionProductDetailDrawer[\s\S]*v-model:visible="detailDrawerVisible"/, 'promotion product page should mount the detail drawer');
assert.match(detailPage, /<el-drawer[\s\S]*:model-value="visible"[\s\S]*direction="rtl"[\s\S]*size="60%"/, 'promotion product detail should open in a right-side drawer');
assert.match(detailPage, /app-surface-header app-surface-header--drawer[\s\S]*活动商品详情/, 'promotion product detail drawer should reuse shared drawer header style');
assert.match(detailPage, /app-drawer-content app-drawer-sections/, 'promotion product detail drawer should reuse shared drawer section layout');
assert.match(detailPage, /商品明细[\s\S]*<AppImage[\s\S]*getProductDisplayName\(product\)[\s\S]*OfferId:[\s\S]*SKU:/, 'promotion product detail should use order-like product summary with image, name, offer and sku');
assert.match(detailPage, /价格信息[\s\S]*促销信息[\s\S]*数据分析[\s\S]*库存与限制/, 'promotion product detail drawer should group visible business data into titled sections');
assert.match(detailPage, /getActivityDiscountAmount/, 'promotion product detail drawer should show activity discount amount');
assert.match(detailPage, /getPromotionBoost/, 'promotion product detail drawer should show promotion boost');
assert.match(detailPage, /getLiftPriceMin[\s\S]*getLiftPriceMax/, 'promotion product detail drawer should show Ozon lift price min and max');
assert.match(detailPage, /getSevenDayOrders[\s\S]*getSevenDayViews/, 'promotion product detail drawer should show Ozon seven-day analytics');
assert.match(detailPage, /getOzonWarehouseStockDisplay[\s\S]*getOwnWarehouseStockDisplay/, 'promotion product detail drawer should show Ozon and own warehouse stock');
assert.match(detailPage, /getOtherPromotionsDisplay/, 'promotion product detail drawer should show other promotion participation data');
assert.match(detailPage, /showRawProductData[\s\S]*原始API数据[\s\S]*formattedRawProduct/, 'promotion product raw API data should be a collapsible JSON block like order and product detail');
assert.match(detailPage, /grid grid-cols-2 gap-x-10 gap-y-3/, 'promotion product detail rows should match order detail two-column layout');
assert.doesNotMatch(detailPage, /\.detail-row[\s\S]*(border|border-radius|background):/, 'promotion product detail rows should not use input-card styling');
assert.doesNotMatch(detailPage, /<AppDialog[\s\S]*title="活动商品详情"/, 'promotion product detail should not use a modal dialog');
assert.doesNotMatch(detailPage, /<AppTableButton[\s\S]*name="edit"[\s\S]*tooltip="价格和库存"/, 'promotion product operations should not include price and stock edit button');
assert.match(detailPage, /<AppTableButton[\s\S]*name="delete"[\s\S]*tooltip="移出活动"/, 'promotion product operation should reuse shared delete table button style');
assert.doesNotMatch(detailPage, /<template #cell-action="\{ row \}">[\s\S]*<el-button[\s\S]*移出活动[\s\S]*<\/el-button>/, 'promotion product operation should not use a local text action button');
assert.match(detailPage, /font-size:\s*18px;/, 'promotion product title should use a compact title size');
assert.match(detailPage, /class="btn-create promotion-add-button"/, 'promotion product add button should reuse shared create button style');
assert.doesNotMatch(detailPage, /\.promotion-add-button\s*\{[\s\S]*height:\s*40px;/, 'promotion product add button should not override shared create button height');
assert.match(detailPage, /\.promotion-status-tab\.is-active::after[\s\S]*background:\s*#3b82f6/, 'promotion product active tab should use Ozon-like underline styling');
assert.match(detailPage, /\.promotion-status-tab-count[\s\S]*height:\s*17px/, 'promotion product tab count badge should stay compact');
assert.match(detailPage, /\.promotion-back-link[\s\S]*min-width:\s*78px/, 'promotion back link should keep a compact Ozon-like width');
assert.match(detailPage, /\.promotion-back-link[\s\S]*font-size:\s*14px/, 'promotion back link should use a stronger readable size');
assert.match(detailPage, /\.promotion-back-link[\s\S]*font-weight:\s*600/, 'promotion back link should use coordinated medium weight');
assert.doesNotMatch(detailPage, /showAddDrawer\.value\s*=\s*true;[\s\S]*route\.query\.openAdd/, 'promotion product page should not auto-open the add drawer from route query');
assert.match(detailPage, /key:\s*'photo'[\s\S]*width:\s*'20'/, 'promotion product table should use a narrow photo column');
assert.match(detailPage, /key:\s*'action'[\s\S]*width:\s*'24'/, 'promotion product table should keep action columns compact');
assert.match(detailPage, /class="promotion-products-table"/, 'promotion product table should have page-specific fit styling');
assert.match(detailPage, /\.promotion-products-table[\s\S]*table-layout:\s*fixed/, 'promotion product table should use fixed layout so all columns fit the card');
assert.match(detailPage, /key:\s*'product'[\s\S]*minWidth:\s*'116px'/, 'promotion product name/category column should be shorter');
assert.match(detailPage, /INTERNAL_CATEGORY_VALUES/, 'promotion product category display should filter internal fallback values');
assert.match(detailPage, /getBestProductName/, 'promotion product name should prefer the fullest available Ozon name');
assert.match(detailPage, /editable-promotion-input/, 'promotion product editable promotion fields should use inline inputs');
assert.match(detailPage, /saveInlinePromotionField/, 'promotion product editable fields should save inline through promotion activation API');
assert.match(detailPage, /getPromotionProductCountDisplay/, 'promotion product count should render unlimited fallback and recommended quantity');
assert.match(detailPage, /\.promotion-table-subhead/, 'promotion product table should visually distinguish second-line headers');
assert.match(detailPage, /<span class="promotion-table-mainhead">货号<\/span>[\s\S]*<span class="promotion-table-subhead">SKU<\/span>/, 'promotion product table should style sku header second line');
assert.match(detailPage, /<span class="promotion-table-mainhead">商品名称<\/span>[\s\S]*<span class="promotion-table-subhead">类目<\/span>/, 'promotion product table should style product header second line');
assert.match(detailPage, /\.product-name[\s\S]*max-width:\s*min\(180px,\s*100%\)/, 'promotion product name text should be visually shorter');
assert.doesNotMatch(detailPage, /autofocus/, 'promotion product inline inputs should not auto-select the full value on open');
assert.doesNotMatch(detailPage, /input\?\.select\(\)/, 'promotion product inline inputs should place the cursor without selecting all text');
assert.match(detailPage, /const DEFAULT_RECOMMENDED_PRODUCT_COUNT = 5/, 'promotion product recommended count should use a non-zero fallback');
assert.match(detailPage, /key:\s*'promotionProductCount'[\s\S]*width:\s*'28'/, 'promotion product count column should match other editable column width');
assert.match(detailPage, /getPromotionBoost/, 'promotion product boost should use Ozon current_boost data');
assert.match(detailPage, /current_boost/, 'promotion product boost should map current_boost field');
assert.doesNotMatch(detailPage, /<el-input[\s\S]*class="editable-promotion-input"/, 'promotion product inline edits should avoid heavy Element Plus inputs');
assert.doesNotMatch(detailPage, /@blur="saveInlinePromotionField/, 'promotion product inline edits should not auto-save on blur');
assert.match(detailPage, /editable-promotion-input-wrap/, 'promotion product inline edits should keep input and clear action inside a bounded wrapper');
assert.match(detailPage, /clearInlineEditValue/, 'promotion product inline edits should provide an Ozon-like clear action');
assert.match(detailPage, /\.editable-promotion-input-wrap[\s\S]*max-width:\s*100%/, 'promotion product inline edit wrapper should not exceed the table cell');
assert.match(detailPage, /\.editable-promotion-input[\s\S]*text-align:\s*left/, 'promotion product inline edit text should align left like Ozon');
assert.match(detailPage, /\.editable-promotion-clear/, 'promotion product inline edit should render a right-side clear button');
assert.match(addDrawer, /direction="ttb"/, 'promotion add drawer should open from the top');
assert.match(addDrawer, /size="90%"/, 'promotion add drawer should use top drawer height');
assert.match(addPage, /ozonPromotionAPI\.getPromotionCandidates/, 'add page should load candidate products');
assert.match(addPage, /ozonPromotionAPI\.activateProduct/, 'add page should add a single product');
assert.match(service, /normalizeOperationResult/, 'service should parse per-product Ozon operation errors');
assert.match(service, /resolveCategorySelection/, 'promotion product enrichment should resolve local Ozon category ids into display text');
assert.match(service, /descriptionCategoryId/, 'promotion product enrichment should use locally mapped real category ids');
assert.match(service, /ozonOriginalData/, 'promotion product enrichment should fall back to stored Ozon original category ids');
assert.match(detailPage, /getRowWarnings/, 'detail page should show row warnings from Ozon');
assert.match(addPage, /getRowWarnings/, 'add page should show candidate warnings from Ozon');
assert.match(listPage, /filteredPromotions/, 'list page should support local promotion filtering');
assert.match(listPage, /StatCardGrid/, 'list page should reuse shared stat card grid');
assert.match(listPage, /我正在参与/, 'list page should match Ozon participation wording');
assert.doesNotMatch(listPage, /已参与/, 'list page should not use the old participation wording');
assert.match(listPage, /参与商品数量/, 'list page should show participating product count stat');
assert.match(listPage, /AppSkeletonLoader/, 'list page should use shared skeleton loading animation');
assert.match(listPage, /AppTableButton/, 'list page should reuse shared table action buttons');
assert.doesNotMatch(listPage, /isPromotionAddDisabled/, 'list page should not disable direct add action by guessed promotion rules');
assert.doesNotMatch(listPage, /活动未开始，暂不可添加商品/, 'list page should not block adding products with a guessed not-started tooltip');
assert.match(listPage, /AppPagination/, 'list page should reuse shared pagination');
assert.match(listPage, /AppUpdateButton/, 'list page should reuse shared update button');
assert.match(listPage, /class="px-6 h-\[100px\] flex items-center"/, 'list search module should reuse shared search/update layout spacing');
assert.doesNotMatch(listPage, /promotions-toolbar/, 'promotion list should not render a local title/subtitle toolbar inside the card');
assert.doesNotMatch(listPage, /page-eyebrow|page-title/, 'promotion list should not render the removed title/subtitle block');
assert.doesNotMatch(listPage, /\.search-container\s*\{[\s\S]*?width:/, 'promotion list should not override shared search box width');
assert.match(listPage, /AppDetailDialog/, 'promotion update detail should use the shared detail dialog');
assert.doesNotMatch(listPage, /ElMessage\.info\('促销活动更新会实时读取 Ozon 活动列表'\)/, 'promotion update detail should open a dialog instead of a toast');
assert.doesNotMatch(listPage, /<template #prefix>[\s\S]*<Search[\s\S]*<\/template>/, 'promotion search input should not render a duplicate prefix search icon');
assert.doesNotMatch(listPage, /<div class="promotions-toolbar">[\s\S]*更新活动[\s\S]*<\/div>\s*<div class="promotion-search-bar">/, 'update button should live in the search module, not the header');
assert.match(listPage, /usePromotionTextTranslations/, 'list page should translate promotion title and description');
assert.match(promotionTranslation, /resolveProductNameTranslations/, 'promotion text translation should reuse persisted translation API cache');
assert.match(promotionTranslation, /resolveVisiblePromotionTextTranslations/, 'promotion translation composable should expose batch resolver');
assert.match(listPage, /getSortedAutoAddDates/, 'promotion add plan should be based on API auto_add_dates');
assert.match(listPage, /请添加商品/, 'promotion add plan should fall back when Ozon does not provide auto-add dates');
const addPlanFunction = listPage.match(/const getPromotionAddPlanText = \(row: OzonPromotion\) => \{[\s\S]*?\n\};/)?.[0] || '';
assert.doesNotMatch(addPlanFunction, /potential_products_count/, 'promotion add plan must not use candidate product count as planned add count');
assert.doesNotMatch(addPlanFunction, /我们将添加/, 'promotion add plan must not render guessed planned quantity text');
assert.match(detailDrawer, /app-surface-header app-surface-header--drawer/, 'promotion detail drawer should reuse shared drawer header style');
assert.match(detailDrawer, /<el-tag\s+v-if="item\.tagType"[\s\S]*class="app-table-tag"/, 'promotion detail drawer should reuse shared table tag styling for base info tags');
assert.match(detailDrawer, /将自动添加商品/, 'promotion detail drawer should show auto-add plan in base info');
assert.match(detailDrawer, /getPromotionAddPlanText/, 'promotion detail drawer should calculate auto-add plan from API dates');
assert.match(detailDrawer, /typeLabel/, 'promotion detail drawer should show action type tag');
assert.match(detailDrawer, /participationLabel/, 'promotion detail drawer should show participation status tag');
assert.match(detailDrawer, /autoAddLabel/, 'promotion detail drawer should show auto-add status tag');
assert.match(detailDrawer, /app-drawer-content app-drawer-sections/, 'promotion detail drawer should use shared drawer section layout');
assert.match(detailDrawer, /bg-slate-50 rounded-lg p-4/, 'promotion detail drawer should use shared section card style');
assert.match(detailDrawer, /text-\[13px\] font-semibold text-slate-700 flex items-center mb-5/, 'promotion detail drawer should use shared section title style');
assert.doesNotMatch(detailDrawer, /promotion-detail-frame/, 'promotion detail drawer should not use a custom frame');
assert.doesNotMatch(detailDrawer, /promotion-detail-tags|promotion-detail-tag/, 'promotion detail drawer should not use custom tag styles');
assert.doesNotMatch(detailDrawer, /class="promotion-detail-drawer"/, 'promotion detail drawer should not use a custom drawer wrapper class');
assert.doesNotMatch(detailDrawer, /flex flex-wrap items-center gap-2 mb-4/, 'promotion detail drawer should not render a separate top tag row');
assert.doesNotMatch(detailDrawer, /border:\s*2px solid #0ea5e9/, 'promotion detail drawer should not add custom blue borders');
assert.match(detailDrawer, /descriptionView/, 'promotion detail drawer should group description into titled content sections');
assert.match(detailDrawer, /promotion-description-content--bullet/, 'promotion detail drawer should style bullet indentation');
assert.match(detailDrawer, /resolveVisiblePromotionTextTranslations/, 'promotion detail drawer should translate parsed description lines');

const pendingBlock = statCard.match(/\.stat-card--pending \.stat-card__icon \{[\s\S]*?\}/)?.[0] || '';
const packageBlock = statCard.match(/\.stat-card--package \.stat-card__icon \{[\s\S]*?\}/)?.[0] || '';
const pendingValueBlock = statCard.match(/\.stat-card--pending \.stat-card__value \{[\s\S]*?\}/)?.[0] || '';
const packageValueBlock = statCard.match(/\.stat-card--package \.stat-card__value \{[\s\S]*?\}/)?.[0] || '';
const pendingIconBackground = pendingBlock.match(/background:\s*([^;]+);/)?.[1] || '';
const packageIconBackground = packageBlock.match(/background:\s*([^;]+);/)?.[1] || '';
const pendingValueColor = pendingValueBlock.match(/color:\s*([^;]+);/)?.[1] || '';
const packageValueColor = packageValueBlock.match(/color:\s*([^;]+);/)?.[1] || '';
assert.notEqual(packageIconBackground, pendingIconBackground, 'package stat card should not reuse pending card icon color');
assert.notEqual(packageValueColor, pendingValueColor, 'package stat card should not reuse pending card value color');

assert.match(detailDialog, /class="detail-empty-state"/, 'detail dialog empty state should have a dedicated layout wrapper');
assert.match(detailDialog, /\.detail-empty-state\s*\{[\s\S]*display:\s*flex;/, 'detail dialog empty state should use flex centering');
assert.match(detailDialog, /\.detail-empty-state\s*\{[\s\S]*justify-content:\s*center;/, 'detail dialog empty state should be vertically centered');
assert.match(detailDialog, /\.detail-table-container tbody tr:not\(\.detail-state-row\):hover/, 'detail dialog hover style should not apply to empty/loading state rows');

console.log('ozonPromotionsFeature.test passed');
