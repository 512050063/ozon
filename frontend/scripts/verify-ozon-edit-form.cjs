const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const attributeField = read('src/views/warehouse/product-library/components/AttributeField.vue');
const productEditDrawer = read('src/views/ozon/product-management/components/ProductEditDrawer.vue');
const productManagementIndex = read('src/views/ozon/product-management/Index.vue');

const checks = [
  [attributeField.includes('<el-checkbox'), '布尔属性必须使用复选框'],
  [!attributeField.includes('el-switch'), '共享属性组件中不应再出现开关组件'],
  [attributeField.includes('clearAttributeValue'), '共享属性组件需要支持清空字段'],
  [attributeField.includes('InfoFilled'), '共享属性组件需要显示提示图标'],
  [attributeField.includes('field-actions'), '共享属性组件需要内联操作区'],
  [productEditDrawer.includes('if (!item.required) continue;'), '基础字段校验需要跳过非必填项'],
  [productEditDrawer.includes('required: fixedFieldMeta.value.brand.required'), '品牌必填规则需要跟随模板'],
  [productEditDrawer.includes('required: fixedFieldMeta.value.modelName.required'), '型号必填规则需要跟随模板'],
  [productEditDrawer.includes('label: modelAttr?.name || \'型号名称\''), 'Ozon 编辑模板基础信息需要显示型号名称'],
  [productEditDrawer.includes('modelName: detail.offer_id || detail.offerId'), '型号名称需要使用 offer_id 回填'],
  [productEditDrawer.includes('v-model="formData.sku"') && productEditDrawer.includes('>货号<span'), 'Ozon 编辑模板商品变体里的货号需要绑定 sku'],
  [!productEditDrawer.includes('v-model="formData.offerId"'), 'Ozon 编辑模板商品变体不应重复显示 offer_id 字段'],
  [!productEditDrawer.includes('货号 / SKU'), 'Ozon 编辑模板不应混用货号和 SKU 标签'],
  [!productEditDrawer.includes('当前 SKU'), 'Ozon 编辑模板用户可见提示不应再显示 SKU，应显示货号'],
  [/.field-actions\s*\{[\s\S]*?opacity:\s*0[\s\S]*?pointer-events:\s*none/.test(productEditDrawer), 'Ozon 编辑模板基础信息和尺寸重量输入框图标默认应隐藏'],
  [/.floating-item:hover\s+\.field-actions[\s\S]*\.floating-item:focus-within\s+\.field-actions[\s\S]*opacity:\s*1[\s\S]*pointer-events:\s*auto/.test(productEditDrawer), 'Ozon 编辑模板基础信息和尺寸重量输入框图标应在悬浮或选中时显示'],
  [!productManagementIndex.includes('if (scrollObserver)'), '商品管理页卸载时不应引用未声明的 scrollObserver'],
  [!productManagementIndex.includes("'/images/default-product.png'"), '商品管理页不应再返回不存在的默认商品图路径'],
];

const failed = checks.filter(([passed]) => !passed).map(([, message]) => message);

if (failed.length > 0) {
  console.error('FAIL verify-ozon-edit-form');
  failed.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('PASS verify-ozon-edit-form');
