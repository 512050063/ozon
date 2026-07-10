export const SYSTEM_PERMISSIONS = [
  'dashboard',
  'product-analysis',
  'price-management',
  'source-collection',
  'source-collection/product-collection',
  'source-collection/supply-management',
  'warehouse',
  'warehouse/product-library',
  'warehouse/material-library',
  'ozon/store-management',
  'ozon/order-management',
  'ozon/product-management',
  'ozon/promotions',
  'ozon/finance-report',
  'ozon/pricing',
  'ozon/customer-service',
  'ozon/customer-service/auto-reply',
  'ozon/customer-service/messages',
  'settings',
  'settings/account-info',
  'settings/role-management',
  'settings/user-management',
  'settings/payment-records',
  'settings/api-config',
  'vip',
] as const;

export const BASELINE_TABLES = [
  'ozon_categories',
  'ozon_product_templates',
  'ozon_category_attributes',
  'ozon_attribute_values',
  'ozon_error_codes',
  'translation_cache',
] as const;

export const PRIVATE_RUNTIME_TABLES = [
  'users',
  'ozon_stores',
  'user_tokens',
  'api_configs',
  'products',
  'ozon_orders',
  'finance_accruals',
  'product_selection',
] as const;

export type BaselineTableName = typeof BASELINE_TABLES[number];

export interface InstallAdminInput {
  username: string;
  password: string;
  nickname?: string;
}

export interface ProductionSeedInput {
  admin: InstallAdminInput;
}
