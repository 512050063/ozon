import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const drawer = fs.readFileSync(path.join(root, 'frontend/src/views/ozon/order-management/components/OrderDetailDrawer.vue'), 'utf8');
const orderManagement = fs.readFileSync(path.join(root, 'frontend/src/views/ozon/order-management/index.vue'), 'utf8');
const orderService = fs.readFileSync(path.join(root, 'backend/src/services/ozonOrderService.ts'), 'utf8');

assert.match(
  drawer,
  /formatPrice\(fp\.price,\s*getFinancialProductPriceCurrency\(idx,\s*fp\)\)/,
  'financial product price should use the product price currency, not settlement currency'
);
assert.match(
  drawer,
  /formatPrice\(fp\.old_price,\s*getFinancialProductPriceCurrency\(idx,\s*fp\)\)/,
  'financial product old price should use the product price currency, not settlement currency'
);
assert.match(
  drawer,
  /formatPrice\(fp\.customer_price,\s*fp\.customer_currency_code\)/,
  'financial product customer price should use the API customer currency without local inference'
);
assert.match(
  drawer,
  /formatPrice\(fp\.total_discount_value,\s*fp\.currency_code\)/,
  'financial product discount amount should use the API settlement currency without local inference'
);
assert.doesNotMatch(
  drawer,
  /getFinancialCustomerPriceCurrency/,
  'order detail should not infer customer price currency from amount magnitude'
);
assert.match(
  drawer,
  /cancel_reason_zh[\s\S]*cancel_reason/,
  'order detail should prefer stored translated cancel reason'
);
assert.match(
  drawer,
  /cancellation_initiator_zh[\s\S]*cancellation_initiator/,
  'order detail should prefer stored translated cancellation initiator'
);
assert.match(
  drawer,
  /formatCancellationType\(order\.raw\?\.cancellation\)/,
  'order detail should translate cancellation type instead of showing raw API values'
);
assert.match(
  orderManagement,
  /ozonOrderAPI\.getOrderDetail\(currentStoreId\.value,\s*order\.postingNumber\)/,
  'order detail drawer should use the detail API instead of stale list row data'
);

assert.match(
  orderService,
  /enrichCancellationTranslations/,
  'order service should enrich cancellation fields before storing orders'
);
assert.match(
  orderService,
  /translationCache\.upsert[\s\S]*sourceLang:\s*'ru'[\s\S]*targetLang:\s*'zh'/,
  'order service should persist local cancellation translations in translation_cache'
);
assert.match(
  orderService,
  /cancel_reason_zh[\s\S]*cancellation_initiator_zh/,
  'order service should store translated cancel reason and initiator fields'
);
assert.match(
  orderService,
  /вы не отгрузили заказ вовремя[\s\S]*您未按时发货/,
  'order service should include the common seller late-shipment cancellation reason in local translations'
);
assert.match(
  orderService,
  /cancellation_type_zh/,
  'order service should store translated cancellation type fields'
);

console.log('ozonOrderDetailDisplay.test passed');
