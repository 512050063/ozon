import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const filePath = path.resolve('src/views/warehouse/product-library/components/AddProductDrawer.vue');
const source = fs.readFileSync(filePath, 'utf8');

assert.match(source, /import\s+\{[\s\S]*ref[\s\S]*computed[\s\S]*\}\s+from\s+'vue';/, 'AddProductDrawer 需要显式导入使用到的 Vue 组合式 API');
assert.doesNotMatch(source, /removeDuplicatedBaseAttributesFromValues\(\);/, '保存商品时不应调用已删除的 removeDuplicatedBaseAttributesFromValues');

assert.match(source, /id="field-images"/, '商品图需要有可定位的必填字段容器');
assert.match(source, /key:\s*'images'[\s\S]*label:\s*'商品图'/, '填写统计需要统计商品图');
assert.match(source, /categoryText\.value\s*=\s*''/, '新增或关闭后需要清空商品类目显示文本');
assert.match(source, /selectedTypeId\.value\s*=\s*0/, '新增或关闭后需要清空已选 Ozon 类型');

const modelField = source.match(/id="field-modelName"[\s\S]*?<p class="field-hint"/)?.[0] ?? '';
assert.ok(modelField, '需要找到型号字段');
assert.doesNotMatch(modelField, /\sreadonly\b/, '型号字段需要允许手动编辑');
assert.match(modelField, /field-action-button[\s\S]*InfoFilled/, '型号名称字段需要显示清空和详情提示图标');
assert.match(source, /name:\s*\{[\s\S]*tooltip:\s*fieldTooltips\.name/, '商品名称字段需要显示详情提示图标');
assert.match(source, /brand:\s*\{[\s\S]*required:\s*true/, '品牌是商品库基础必填项，标签需要固定显示必填星号');
assert.match(source, /modelName:\s*\{[\s\S]*required:\s*true/, '型号名称是商品库基础必填项，标签需要固定显示必填星号');

for (const field of ['packageLength', 'packageWidth', 'packageHeight', 'grossWeight']) {
  const fieldBlock = source.match(new RegExp(`id="field-${field}"[\\s\\S]*?<p class="field-hint"`))?.[0] ?? '';
  assert.ok(fieldBlock, `需要找到 ${field} 字段`);
  assert.match(fieldBlock, /<el-input\b/, `${field} 需要使用普通输入框`);
  assert.doesNotMatch(fieldBlock, /<el-input-number\b/, `${field} 不应显示加减按钮`);
  assert.match(fieldBlock, /parseNumberInput/, `${field} 需要保留数字限制`);
  assert.match(fieldBlock, /field-action-button[\s\S]*InfoFilled/, `${field} 需要显示清空和详情提示图标`);
}

assert.doesNotMatch(source, /<el-input-number\b/, '商品库添加/编辑抽屉不应使用带加减按钮的数字框');

const attributeFieldPath = path.resolve('src/views/warehouse/product-library/components/AttributeField.vue');
const attributeFieldSource = fs.readFileSync(attributeFieldPath, 'utf8');
assert.doesNotMatch(attributeFieldSource, /<el-input-number\b/, '动态数字属性不应使用带加减按钮的数字框');
assert.match(attributeFieldSource, /handleNumberInput/, '动态数字属性需要保留数字输入限制');
assert.doesNotMatch(attributeFieldSource, /\.select-field-actions\s*\{\s*right:\s*30px;/, '下拉框和文本框的详情图标右侧边距需要一致');

const displayHelperPath = path.resolve('src/views/warehouse/product-library/components/productTemplateDisplay.ts');
const displayHelperSource = fs.readFileSync(displayHelperPath, 'utf8');
assert.match(displayHelperSource, /type BaseFieldKey = 'name' \| 'brand' \| 'modelName' \| 'type'/, 'Ozon 名称、品牌、型号、类型应归入商品信息提示');
assert.match(displayHelperSource, /BASE_ATTRIBUTE_PREFIX_ALIASES/, '型号名称（带说明）需要通过前缀识别为商品信息字段');
assert.match(displayHelperSource, /const editableVariantAttributes = isEditMode[\s\S]*: \[\]/, '添加模式变体特征区不应渲染非 SKU 技术属性');
assert.match(displayHelperSource, /const visibleHiddenAttributes = uniqueById\(\[/, '非 SKU 模板属性需要归入隐藏特征');

assert.doesNotMatch(source, />俄文</, '编辑模板不应在商品信息里额外显示俄文字段');
assert.match(source, /v-if="isEditMode"[\s\S]*class="single-sku-card"/, '编辑模式需要在变体模块显示单 SKU 卡片');
assert.match(source, /id="field-single-sku"[\s\S]*v-model="formData\.sku"[\s\S]*>货号<span/, '单 SKU 区货号需要绑定 sku');
assert.match(source, /请输入商品货号或您库存中的编号。货号应在您商品种类中独一无二/, '货号字段提示需要沿用 Ozon 文案');
assert.doesNotMatch(source, /id="field-single-sku"[\s\S]*v-model="formData\.offerId"/, '单 SKU 区不应重复显示 offer_id 字段');
assert.doesNotMatch(source, /型号 offer_id|货号 SKU|商品型号编码|请填写型号 offer_id|>SKU<span|当前 SKU|新增 SKU|重置 SKU|SKU 行/, 'offer_id 不应再显示为变体字段，sku 不应显示为 SKU 用户文案');
assert.match(source, /id="field-single-sku"[\s\S]*条形码/, '单 SKU 区需要包含条形码字段');
assert.match(source, /id="field-single-sku"[\s\S]*价格/, '单 SKU 区需要包含价格字段');
assert.match(source, /id="field-single-sku"[\s\S]*折扣前价格/, '单 SKU 区需要包含折扣前价格字段');
assert.match(source, /v-if="!isEditMode && skuDimensionCandidates\.length > 0"[\s\S]*新增货号/, '多货号矩阵只应在新增模式显示');
assert.match(source, /const initialOfferId = initialData\.offerId[\s\S]*modelName:\s*initialData\.modelName\s*\|\|\s*initialOfferId/, '编辑模式型号名称需要从 modelName 或 offerId 自动回填');
assert.match(source, /\.field-actions\s*\{[\s\S]*?opacity:\s*0[\s\S]*?pointer-events:\s*none/, '基础信息和尺寸重量输入框图标默认应隐藏');
assert.match(source, /\.floating-item:hover\s+\.field-actions[\s\S]*\.floating-item:focus-within\s+\.field-actions[\s\S]*opacity:\s*1[\s\S]*pointer-events:\s*auto/, '基础信息和尺寸重量输入框图标应在悬浮或选中时显示');
assert.match(source, /data\?\.id\s*!==\s*undefined[\s\S]*data\?\.id\s*!==\s*null/, '编辑模式应使用商品 id 判断，不能依赖商品名称');
assert.match(source, /normalizeImageUrls/, '编辑模式需要兼容本地图片 URL 数组和图片对象数组');
assert.match(source, /normalizeNumberField/, '编辑模式尺寸重量需要规范化为数字或空值');
assert.match(source, /isEditMode\.value[\s\S]*fetchProductTemplate/, '编辑模式需要重新加载完整模板，避免隐藏属性下拉选项为空');
assert.match(source, /fetchProductTemplate\(resolvedDescriptionCategoryId[\s\S]*cacheOnly:\s*true[\s\S]*keepExistingOnEmpty:\s*true/, '编辑模式应只读取数据库模板缓存，缓存缺失时保留商品快照');
assert.match(source, /<ImageGalleryPicker[\s\S]*:existing-image-ids="images"[\s\S]*:existing-image-urls="imageUrls"/, '商品库新建/编辑需要使用系统图片库选择器并传入已选图片');
assert.doesNotMatch(source, /image-source=/, '商品库图片选择器不应再指定外部图片来源');

const imageGalleryPickerPath = path.resolve('src/views/warehouse/material-library/components/ImageGalleryPicker.vue');
const imageGalleryPickerSource = fs.readFileSync(imageGalleryPickerPath, 'utf8');
assert.doesNotMatch(imageGalleryPickerSource, /imageSource/, '图片选择器不应再暴露外部图片来源参数');
assert.match(imageGalleryPickerSource, /source:\s*'local'/, '图片选择器列表查询应固定使用系统图片库');
assert.match(imageGalleryPickerSource, /uploadImage\(item\.file,\s*'local',\s*'product'\)/, '图片选择器上传新图应保存到系统图片库');

const indexPath = path.resolve('src/views/warehouse/product-library/index.vue');
const indexSource = fs.readFileSync(indexPath, 'utf8');
for (const field of ['packageLength', 'packageWidth', 'packageHeight', 'grossWeight']) {
  assert.match(indexSource, new RegExp(`${field}:\\s*data\\.${field}`), `编辑提交需要包含 ${field}`);
}

const apiPath = path.resolve('src/api/productSupplyAPI.ts');
const apiSource = fs.readFileSync(apiPath, 'utf8');
assert.match(apiSource, /cacheOnly\?:\s*boolean/, '商品模板接口需要支持只读数据库缓存参数');
for (const field of ['packageLength', 'packageWidth', 'packageHeight', 'grossWeight']) {
  assert.match(apiSource, new RegExp(`${field}:\\s*number`), `商品库列表项类型需要包含 ${field}`);
  assert.match(apiSource, new RegExp(`${field}\\?:\\s*number`), `更新接口类型需要包含 ${field}`);
}

const backendRoot = path.resolve('..', 'backend');
const schemaSource = fs.readFileSync(path.join(backendRoot, 'prisma/schema.prisma'), 'utf8');
const productSupplyModel = schemaSource.match(/model ProductSupply \{[\s\S]*?\n\}/)?.[0] ?? '';
for (const field of ['packageLength', 'packageWidth', 'packageHeight', 'grossWeight']) {
  assert.match(productSupplyModel, new RegExp(`${field}\\s+Float(?:\\?|\\s+@default\\(0\\))`), `ProductSupply 模型需要持久化 ${field}`);
}

const controllerSource = fs.readFileSync(path.join(backendRoot, 'src/controllers/productSupplyController.ts'), 'utf8');
for (const field of ['packageLength', 'packageWidth', 'packageHeight', 'grossWeight']) {
  assert.match(controllerSource, new RegExp(`${field}:\\s*(?:Number\\(sku\\.${field}|parseNullableFloat\\(sku\\.${field}\\))`), `创建商品库 SKU 时需要写入 ${field}`);
  assert.match(controllerSource, new RegExp(`${field}\\s*,[\\s\\S]*?=\\s*req\\.body`), `更新接口需要从 req.body 解构 ${field}`);
  assert.match(controllerSource, new RegExp(`${field}:\\s*${field}\\s*!==\\s*undefined`), `更新商品库 SKU 时需要写入 ${field}`);
}

const ozonProductServiceSource = fs.readFileSync(path.join(backendRoot, 'src/services/ozonProductService.ts'), 'utf8');
assert.match(ozonProductServiceSource, /OZON_PRODUCT_IMPORT_API\s*=\s*'https:\/\/api-seller\.ozon\.ru\/v3\/product\/import'/, '上架到 Ozon 需要使用 v3 product import 接口');
assert.match(ozonProductServiceSource, /description_category_id:\s*productData\.descriptionCategoryId/, '上架到 Ozon 需要传输 description_category_id');
assert.match(ozonProductServiceSource, /type_id:\s*productData\.typeId/, '上架到 Ozon 需要传输 type_id');
assert.match(ozonProductServiceSource, /enrichOzonProductAttributesForImport/, '上架到 Ozon 前需要把本地属性 map 转换为 Ozon attributes 数组');
assert.match(ozonProductServiceSource, /const\s+ozonAttributes\s*=\s*enrichOzonProductAttributesForImport\(productData,\s*dictionaryValues\)/, '上架到 Ozon 前需要先构建 Ozon attributes 数组');
assert.match(ozonProductServiceSource, /attributes:\s*ozonAttributes/, '上架到 Ozon 不能直接传本地 attributes 对象');
assert.match(ozonProductServiceSource, /price:\s*toOzonStringNumber\(productData\.price\)/, '上架到 Ozon 时 price 需要按字符串传输');
assert.match(ozonProductServiceSource, /async\s+function\s+buildOzonImageUrls\(productData:\s*any\):\s*Promise<string\[\]>/, '上架到 Ozon 前需要统一整理图片 URL');
assert.match(ozonProductServiceSource, /resolveProductImagesForOzon/, '上架到 Ozon 前需要统一整理图片 URL');
assert.match(ozonProductServiceSource, /resolvePublicAssetUrl/, '本地图片路径需要通过 PUBLIC_BASE_URL 转为公网 URL');
assert.match(ozonProductServiceSource, /isManagedImagePath/, '上架到 Ozon 前需要识别系统托管图片路径');
assert.doesNotMatch(ozonProductServiceSource, /uploadLocalImageToImageHost/, '上架到 Ozon 前不应再上传到第三方图片服务');
assert.match(ozonProductServiceSource, /primary_image:\s*imageUrls\[0\]\s*\|\|\s*''/, '上架到 Ozon 时 primary_image 需要使用校验后的第一张图片');
assert.match(ozonProductServiceSource, /images:\s*imageUrls/, '上架到 Ozon 时 images 需要使用校验后的图片 URL 列表');
assert.match(ozonProductServiceSource, /depth:\s*productData\.packageLength[\s\S]*width:\s*productData\.packageWidth[\s\S]*height:\s*productData\.packageHeight/, '上架到 Ozon 时需要传输长宽高');
assert.match(ozonProductServiceSource, /dimension_unit:\s*'mm'/, '上架到 Ozon 时需要传输尺寸单位');
assert.match(ozonProductServiceSource, /weight:\s*productData\.grossWeight/, '上架到 Ozon 时需要传输重量');
assert.match(ozonProductServiceSource, /weight_unit:\s*'g'/, '上架到 Ozon 时需要传输重量单位');

const templateServiceSource = fs.readFileSync(path.join(backendRoot, 'src/services/productSupplyTemplateService.ts'), 'utf8');
assert.match(templateServiceSource, /cacheOnly\?:\s*boolean/, '后端商品模板服务需要支持只读缓存模式');
assert.match(templateServiceSource, /if \(params\.cacheOnly\)[\s\S]*return null;/, '只读缓存模式缓存缺失时不应请求 Ozon');
assert.doesNotMatch(templateServiceSource, /CLIENT_ATTRIBUTE_VALUES_LIMIT/, '商品库模板返回不能裁剪大字典下拉 values，否则编辑隐藏属性会空数据');

console.log('add product drawer checks passed');
