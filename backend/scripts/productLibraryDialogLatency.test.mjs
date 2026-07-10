import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..', '..')

const addDrawer = fs.readFileSync(
  path.join(root, 'frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue'),
  'utf8',
)
const categoryDialog = fs.readFileSync(
  path.join(root, 'frontend/src/components/ui/CategorySelectDialog.vue'),
  'utf8',
)
const imagePicker = fs.readFileSync(
  path.join(root, 'frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue'),
  'utf8',
)
const attributeField = fs.readFileSync(
  path.join(root, 'frontend/src/views/warehouse/product-library/components/AttributeField.vue'),
  'utf8',
)
const productManagementEditDrawer = fs.readFileSync(
  path.join(root, 'frontend/src/views/ozon/product-management/components/ProductEditDrawer.vue'),
  'utf8',
)
const ozonPreferenceIndex = fs.readFileSync(
  path.join(root, 'frontend/src/views/product-analysis/ozon-preference/Index.vue'),
  'utf8',
)
const ozonPreferenceSearchBar = fs.readFileSync(
  path.join(root, 'frontend/src/views/product-analysis/ozon-preference/components/SearchBar.vue'),
  'utf8',
)
const sourceCollectionIndex = fs.readFileSync(
  path.join(root, 'frontend/src/views/source-collection/product-collection/Index.vue'),
  'utf8',
)

assert.match(addDrawer, /const deferToNextPaint = \(\)/, 'product drawer should have a next-paint deferral helper')
assert.match(addDrawer, /:load-tree-data="getCategoryTreeData"/, 'product drawer should use the shared category dialog lazy tree loader')
assert.doesNotMatch(addDrawer, /categoryDialogTreeData = ref<TreeNode\[\] \| null>\(null\)/, 'product drawer should not own category dialog loading state')
assert.doesNotMatch(addDrawer, /categoryDialogTreeData\.value = getCategoryTreeData\(\)/, 'product drawer should not assign category tree data manually')
assert.match(addDrawer, /void fetchProductTemplateDeferred/, 'template loading should be scheduled after category selection paints')
assert.match(addDrawer, /templateLoadingVisible = computed/, 'template loading visibility should keep variant and hidden sections visible before data arrives')
assert.match(addDrawer, /attribute-loading-skeleton/, 'template loading should render a skeleton placeholder instead of a single sudden content swap')
assert.match(addDrawer, /await deferToNextPaint\(\)[\s\S]*applyProductTemplateResponse/, 'template response should be applied after the loading skeleton has had a paint')
assert.match(addDrawer, /id="section-variant-features"/, 'variant section should have a stable anchor for loading scroll')
assert.match(addDrawer, /scrollToTemplateLoadingSection/, 'category selection should scroll to the loading template section before data arrives')
assert.match(addDrawer, /await scrollToTemplateLoadingSection\(\)[\s\S]*return fetchProductTemplate/, 'template fetch should start after the loading section is scrolled into view')
assert.match(addDrawer, /getSkuDimensionVisibleOptions/, 'SKU dimension selects should render a bounded visible option list')
assert.doesNotMatch(addDrawer, /v-for="value in attr\.values \|\| \[\]"/, 'SKU dimension selects must not render every dictionary value at once')
assert.match(addDrawer, /v-if="templateLoadingVisible \|\| hiddenFeaturesExpanded"/, 'hidden attributes should not mount while collapsed')
assert.doesNotMatch(addDrawer, /v-show="hiddenFeaturesExpanded \|\| templateLoadingVisible"/, 'hidden attributes must not use v-show because it still mounts all fields')

assert.match(attributeField, /renderedSelectOptions/, 'attribute field selects should render bounded option lists')
assert.doesNotMatch(attributeField, /v-for="\([^"]+\) in \(attribute\.values \|\| \[\]\)"/, 'attribute field selects must not render every dictionary value at once')

assert.match(categoryDialog, /treeData\?: any\[\] \| null/, 'category dialog should accept optional tree data for compatibility')
assert.match(categoryDialog, /loadTreeData\?: \(\) => any\[\] \| Promise<any\[\]>/, 'category dialog should expose a shared lazy tree loader prop')
assert.match(categoryDialog, /const displayTreeData = ref<any\[\] \| null>\(null\)/, 'category dialog should own the displayed loading/data state')
assert.match(categoryDialog, /const treeLoading = ref\(false\)/, 'category dialog should keep a separate loading overlay state')
assert.match(categoryDialog, /const treeReady = computed\(\(\) => Array\.isArray\(displayTreeData\.value\)\)/, 'category dialog should render loading state until its internal tree data exists')
assert.match(categoryDialog, /const loadTreeForDialog = async/, 'category dialog should lazy-load tree data after opening')
assert.match(categoryDialog, /await deferToNextPaint\(\)[\s\S]*await loadTreeForDialog\(\)/, 'category dialog should paint the loading state before loading tree data')
assert.match(categoryDialog, /loadingDelayMs: 160/, 'category dialog should keep the loading state visible briefly for consistent feedback')
assert.match(categoryDialog, /await delay\(props\.loadingDelayMs\)/, 'category tree loading should wait briefly after paint before rendering the tree')
assert.match(categoryDialog, /await nextTick\(\)[\s\S]*await deferToNextPaint\(\)[\s\S]*treeLoading\.value = false/, 'category dialog should keep loading visible until the tree has mounted and painted')
assert.match(categoryDialog, /class="tree-loading-wrap"/, 'category dialog should use a loading overlay instead of replacing the tree pane')
assert.doesNotMatch(categoryDialog, /mode="out-in"/, 'category dialog must not remove the loading pane before the tree has mounted')
assert.match(categoryDialog, /let filterTimer/, 'category tree filtering should be debounced to avoid blocking clicks and scrolling')
assert.match(categoryDialog, /scheduleTreeFilter/, 'category dialog should schedule tree filtering instead of filtering synchronously')
assert.match(categoryDialog, /const handleConfirm = async/, 'category confirmation should close the dialog before notifying the parent')
assert.match(categoryDialog, /dialogVisible\.value = false[\s\S]*await deferToNextPaint\(\)[\s\S]*emit\('select'/, 'category selection should be emitted after the close frame has painted')

assert.match(imagePicker, /const fetchRequestToken = ref\(0\)/, 'image picker should guard stale image requests')
assert.match(imagePicker, /const fetchImagesDeferred = async/, 'image picker should fetch images after the dialog has painted')
assert.match(imagePicker, /await deferToNextPaint\(\)[\s\S]*await fetchImages/, 'image picker should defer gallery fetch until after paint')

for (const [name, source] of [
  ['product management edit drawer', productManagementEditDrawer],
  ['ozon preference index', ozonPreferenceIndex],
  ['ozon preference search bar', ozonPreferenceSearchBar],
  ['source collection index', sourceCollectionIndex],
]) {
  assert.match(source, /:load-tree-data="getCategoryTreeData"/, `${name} should use the shared category dialog lazy tree loader`)
  assert.doesNotMatch(source, /const categoryTreeData = computed\(\(\) => buildCategoryTree\(ozonCategories\)\)/, `${name} should not build the category tree through a render-time computed prop`)
}

console.log('productLibraryDialogLatency tests passed')
