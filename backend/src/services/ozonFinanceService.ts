import prisma from '../config/database';
import logger from '../config/logger';

// ─── 常量 ────────────────────────────────────────────────
const OZON_API = 'https://api-seller.ozon.ru';
const V3_LIST = `${OZON_API}/v3/finance/transaction/list`;
const V3_TOTALS = `${OZON_API}/v3/finance/transaction/totals`;
const MAX_PERIOD_DAYS = 31; // v3 单次最多 1 个日历月
const DELAY_MS = 1200;
const MAX_RETRIES = 3;

// ─── 俄文 → 中文 映射字典（Ozon v3 财务 API 返回的 operation_type_name）──
const OPERATION_TYPE_NAME_ZH: Record<string, string> = {
  // 销售
  'Начисление за продажу': '销售收入',
  'Начисление за продажи': '销售收入',
  'Продажа': '销售',
  // 退货/退款
  'Возврат товара': '退货',
  'Возврат товаров': '退货',
  'Частичный возврат': '部分退货',
  'Возврат покупателю': '退款给买家',
  'Возврат денежных средств': '退款',
  'Отмена заказа': '取消订单',
  'Отмена': '取消',
  // 佣金
  'Комиссия за продажу': '销售佣金',
  'Комиссия': '佣金',
  'Агентское вознаграждение': '代理佣金',
  'Агентское вознаграждение за продажу': '销售代理佣金',
  'Вознаграждение Ozon': 'Ozon佣金',
  // 配送
  'Доставка покупателю': '配送费',
  'Доставка': '配送费',
  'Партнерская доставка': '合作伙伴交付',
  'Логистика': '物流费',
  'Логистика обратная': '退货物流',
  'Обратная доставка': '退货配送',
  'Услуги по доставке товаров Ozon': 'Ozon配送服务',
  'Магистральная доставка': '干线配送',
  'Последняя миля': '最后一公里配送',
  'Эквайринг': '收单业务',
  // 包裹处理
  'Обработка отправления': '包裹处理',
  'Обработка отправлений': '包裹处理',
  'Услуги по обработке отправлений': '包裹处理服务',
  'Приёмка товара': '收货',
  'Хранение': '仓储费',
  // 推广
  'Услуги продвижения товаров': '推广服务',
  'Услуги продвижения': '推广服务',
  'Продвижение': '推广',
  'Реклама': '广告',
  // 快速收集评价 / 其他推广子项
  'Быстрый сбор отзывов': '快速收集评价',
  'Продвижение в поиске': '搜索推广',
  'Платное продвижение': '付费推广',
  // 赔偿
  'Возмещение ущерба': '赔偿',
  'Возмещение брака': '瑕疵赔偿',
  'Возмещение утери': '丢失赔偿',
  'Компенсация Ozon': 'Ozon赔偿',
  'Компенсация': '赔偿',
  // 罚款
  'Штраф': '罚款',
  'Штраф за задержку': '延迟罚款',
  'Штраф за отмену': '取消罚款',
  'Штраф за невыкуп': '未取件罚款',
  'Штраф за нарушение': '违规罚款',
  // 其他
  'Прочие услуги': '其他服务',
  'Прочие начисления': '其他应计',
  'Прочие': '其他',
  'Корректировка взаиморасчетов': '结算调整',
  'Корректировка': '调整',
  'Списание задолженности': '债务抵扣',
  'Кредит': '信贷',
  'Рассрочка': '分期付款',
  'Платёж': '付款',
  'Перевод средств': '转账',
  // 英文兜底
  'MarketplaceSale': '销售收入',
  'MarketplaceReturn': '退货',
  'MarketplaceService': '平台服务',
  'Delivery': '配送费',
  'Penalty': '罚款',
  'Compensation': '赔偿',
  'Commission': '佣金',
  'AgentFee': '代理费',
  'Other': '其他',
};

/** 将 Ozon 俄文 operation_type_name 转为中文 */
export function translateOpType(ruName: string | null | undefined): string {
  if (!ruName) return '其他';
  // 精确匹配
  if (OPERATION_TYPE_NAME_ZH[ruName]) return OPERATION_TYPE_NAME_ZH[ruName];
  // 子串匹配（俄文可能有细微差异）
  for (const [key, val] of Object.entries(OPERATION_TYPE_NAME_ZH)) {
    if (ruName.toLowerCase().includes(key.toLowerCase())) return val;
  }
  // 无法翻译时返回原文
  return ruName;
}

// ─── delivery_schema 中文映射 ────────────────────────────
const DELIVERY_SCHEMA_ZH: Record<string, string> = {
  'FBO': 'FBO (平台仓)',
  'fbo': 'FBO (平台仓)',
  'FBS': 'FBS (自发货)',
  'fbs': 'FBS (自发货)',
  'RFBS': 'rFBS (实时自发货)',
  'rfbs': 'rFBS (实时自发货)',
  'Cross-border': '跨境',
  'cross-border': '跨境',
  'Кросс-бордер': '跨境',
};

export function translateDeliverySchema(schema: string | null | undefined): string {
  if (!schema) return '—';
  return DELIVERY_SCHEMA_ZH[schema] || schema;
}

// ─── 类型 ────────────────────────────────────────────────

export interface FinancePosting {
  operation_id: number;
  operation_date: string;
  operation_type: string;
  operation_type_name: string;
  accruals_for_sale: number;
  amount: number;
  sale_commission: number;
  delivery_charge: number;
  return_delivery_charge: number;
  type: string;
  posting_number?: string;
  delivery_schema?: string;
  items?: { name: string; sku: number }[];
  services?: { name: string; price: number }[];
}

export interface FinanceTotals {
  accruals_for_sale: number;
  sale_commission: number;
  processing_and_delivery: number;
  refunds_and_cancellations: number;
  services_amount: number;
  compensation_amount: number;
  expense_positive_amount?: number;
  expense_negative_amount?: number;
  sales_income: number;
  discount_points: number;
  partner_program: number;
  opening_debt: number;
  partner_services: number;
  ozon_delivery_services: number;
  whd_services: number;
  credit_services: number;
  money_transfer: number; // v3 特有
  others_amount: number;
}

export interface FinanceExpenseRow {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface FinanceOperationLike {
  operation_type?: string | null;
  operation_type_name?: string | null;
  type?: string | null;
  accruals_for_sale?: number | null;
  amount?: number | null;
  sale_commission?: number | null;
  delivery_charge?: number | null;
  return_delivery_charge?: number | null;
  services_amount?: number | null;
  compensation_amount?: number | null;
  others_amount?: number | null;
  services?: Array<{ name?: string | null; price?: number | null }> | null;
}

// ─── 工具函数 ────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function safeAmount(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function includesAnyText(value: string, patterns: string[]): boolean {
  const lower = value.toLowerCase();
  return patterns.some(pattern => lower.includes(pattern.toLowerCase()));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseLocalDateBoundary(value: string, boundary: 'start' | 'end'): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(value);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (boundary === 'start') return new Date(year, month, day, 0, 0, 0, 0);
  return new Date(year, month, day, 23, 59, 59, 999);
}

function formatDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousLocalDate(value: string): string {
  const date = parseLocalDateBoundary(value, 'start');
  date.setDate(date.getDate() - 1);
  return formatDateOnly(date);
}

function buildOperationDateWhere(dateFrom?: string, dateTo?: string) {
  if (!dateFrom || !dateTo) return undefined;
  return {
    gte: parseLocalDateBoundary(dateFrom, 'start'),
    lte: parseLocalDateBoundary(dateTo, 'end'),
  };
}

function sumServices(op: FinanceOperationLike, patterns?: string[]): number {
  const services = Array.isArray(op.services) ? op.services : [];
  return services.reduce((sum, service) => {
    const name = service.name || '';
    if (patterns && !includesAnyText(name, patterns)) return sum;
    return sum + safeAmount(service.price);
  }, 0);
}

function operationText(op: FinanceOperationLike): string {
  return [
    op.operation_type,
    op.operation_type_name,
    op.type,
    ...(Array.isArray(op.services) ? op.services.map(service => service.name || '') : []),
  ].filter(Boolean).join(' ');
}

export function classifyFinanceOperation(op: FinanceOperationLike): FinanceTotals {
  const text = operationText(op);
  const amount = safeAmount(op.amount);
  const saleCommission = safeAmount(op.sale_commission);
  const deliveryCharge = safeAmount(op.delivery_charge) + safeAmount(op.return_delivery_charge);
  const lastMileServices = sumServices(op, [
    'LastMile',
    'RedistributionLastMile',
    'MarketplaceServiceItemRedistributionLastMile',
  ]);

  const result: FinanceTotals = {
    accruals_for_sale: safeAmount(op.accruals_for_sale),
    sale_commission: saleCommission,
    processing_and_delivery: deliveryCharge,
    refunds_and_cancellations: 0,
    services_amount: 0,
    compensation_amount: 0,
    sales_income: 0,
    discount_points: 0,
    partner_program: 0,
    opening_debt: 0,
    partner_services: 0,
    ozon_delivery_services: 0,
    whd_services: 0,
    credit_services: 0,
    money_transfer: 0,
    others_amount: 0,
  };

  const isAdvertising = includesAnyText(text, [
    'AcceleratedProductReviews',
    'Ускоренный сбор отзывов',
    'Быстрый сбор отзывов',
    'Promotion',
    'Продвижение',
    'Реклама',
  ]);
  const isPartnerService = includesAnyText(text, [
    'Партнер',
    'Партнёр',
  ]);
  const isPartnerProgram = includesAnyText(text, [
    'Партнерская программа',
    'Партнёрская программа',
    'Partner Program',
  ]);
  const isDiscountPoints = includesAnyText(text, [
    'скид',
    'балл',
    'bonus',
    'point',
    'discount',
  ]);
  const isMarketplaceDelivery = includesAnyText(text, [
    'AgencyFeeAggregator',
    'транспортно-экспедиционных',
  ]);
  const isAcquiring = includesAnyText(text, [
    'Acquiring',
    'Эквайринг',
    'Оплата эквайринга',
  ]);
  const isCompensation = includesAnyText(text, [
    'Compensation',
    'Возмещение',
    'Компенсация',
  ]);
  const isReturn = (op.type || '').toLowerCase() === 'returns' || includesAnyText(text, [
    'Return',
    'Возврат',
    'Отмена',
  ]);
  const isOzonDelivery = includesAnyText(text, [
    'Ozon delivery',
    'Услуги по доставке товаров Ozon',
    'OzonDelivery',
  ]);
  const isWhd = includesAnyText(text, ['WHD']);
  const isCredit = includesAnyText(text, [
    'Credit',
    'Кредит',
    'Рассрочка',
    'Списание задолженности',
  ]);

  const isSale = (op.type || '').toLowerCase() === 'orders' && safeAmount(op.accruals_for_sale) > 0;

  result.processing_and_delivery = deliveryCharge;
  result.partner_services += lastMileServices;
  if (isSale) {
    const saleAccrual = safeAmount(op.accruals_for_sale);
    result.sales_income = amount > 0 ? amount : Math.max(0, saleAccrual + saleCommission + lastMileServices + deliveryCharge);
    result.discount_points = roundMoney(Math.max(0, saleAccrual - result.sales_income));
  }

  if (isReturn) {
    result.refunds_and_cancellations = amount || -Math.abs(safeAmount(op.accruals_for_sale));
  } else if (isPartnerProgram) {
    result.partner_program = amount || safeAmount(op.accruals_for_sale);
  } else if (isDiscountPoints) {
    result.discount_points = amount || safeAmount(op.accruals_for_sale);
  } else if (isAdvertising) {
    result.services_amount = amount;
  } else if (isMarketplaceDelivery) {
    result.processing_and_delivery += amount;
  } else if (isPartnerService) {
    result.partner_services += amount;
  } else if (isCompensation) {
    result.compensation_amount = amount;
  } else if (isOzonDelivery) {
    result.ozon_delivery_services = amount;
  } else if (isWhd) {
    result.whd_services = amount;
  } else if (isCredit) {
    result.credit_services = amount;
  } else if (isAcquiring) {
    result.partner_services += amount;
  } else if (amount < 0 && !result.accruals_for_sale && !saleCommission && !deliveryCharge && !lastMileServices) {
    result.others_amount = amount;
  }

  return result;
}

export function summarizeFinanceOperations(ops: FinanceOperationLike[]): FinanceTotals {
  const total: FinanceTotals = {
    accruals_for_sale: 0,
    sale_commission: 0,
    processing_and_delivery: 0,
    refunds_and_cancellations: 0,
    services_amount: 0,
    compensation_amount: 0,
    sales_income: 0,
    discount_points: 0,
    partner_program: 0,
    opening_debt: 0,
    partner_services: 0,
    ozon_delivery_services: 0,
    whd_services: 0,
    credit_services: 0,
    money_transfer: 0,
    others_amount: 0,
  };

  for (const op of ops) {
    const current = classifyFinanceOperation(op);
    total.accruals_for_sale += current.accruals_for_sale;
    total.sale_commission += current.sale_commission;
    total.processing_and_delivery += current.processing_and_delivery;
    total.refunds_and_cancellations += current.refunds_and_cancellations;
    total.services_amount += current.services_amount;
    total.compensation_amount += current.compensation_amount;
    total.sales_income += current.sales_income;
    total.discount_points += current.discount_points;
    total.partner_program += current.partner_program;
    total.opening_debt += current.opening_debt;
    total.partner_services += current.partner_services;
    total.ozon_delivery_services += current.ozon_delivery_services;
    total.whd_services += current.whd_services;
    total.credit_services += current.credit_services;
    total.money_transfer += current.money_transfer;
    total.others_amount += current.others_amount;
  }

  for (const key of Object.keys(total) as Array<keyof FinanceTotals>) {
    total[key] = roundMoney(safeAmount(total[key]));
  }

  return total;
}

function signedExpenseValue(value: number): number {
  return roundMoney(safeAmount(value));
}

export function buildFinanceExpenseRows(totals: FinanceTotals): FinanceExpenseRow[] {
  return [
    { key: 'advertising', label: '推广和广告', value: signedExpenseValue(totals.services_amount || 0), color: '#db2777' },
    { key: 'delivery', label: '配送服务', value: signedExpenseValue(totals.processing_and_delivery || 0), color: '#f59e0b' },
    {
      key: 'other_services',
      label: '其他服务与罚款',
      value: signedExpenseValue((totals.others_amount || 0) + (totals.refunds_and_cancellations || 0)),
      color: '#94a3b8',
    },
    { key: 'whd_services', label: 'WHD服务', value: signedExpenseValue(totals.whd_services || 0), color: '#d1d5db' },
    { key: 'other_accruals', label: '其他应计项目', value: 0, color: '#e5e7eb' },
    { key: 'ozon_commission', label: 'Ozon代理佣金', value: signedExpenseValue(totals.sale_commission || 0), color: '#3b82f6' },
    { key: 'partner_services', label: '合作伙伴服务', value: signedExpenseValue(totals.partner_services || 0), color: '#a78bfa' },
    { key: 'compensation', label: '赔偿和赔偿返还', value: signedExpenseValue(totals.compensation_amount || 0), color: '#d1d5db' },
    { key: 'ozon_delivery', label: 'Ozon配送服务', value: signedExpenseValue(totals.ozon_delivery_services || 0), color: '#d1d5db' },
    { key: 'credit', label: '借贷和托收信贷', value: signedExpenseValue(totals.credit_services || 0), color: '#d1d5db' },
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

export function calculateFinanceExpenseSplit(expenseRows: FinanceExpenseRow[]): {
  positiveAmount: number;
  negativeAmount: number;
} {
  const positiveAmount = roundMoney(
    expenseRows.reduce((sum, row) => sum + Math.max(0, safeAmount(row.value)), 0)
  );
  const negativeAmount = roundMoney(
    expenseRows.reduce((sum, row) => sum + Math.min(0, safeAmount(row.value)), 0)
  );
  return { positiveAmount, negativeAmount };
}

export function applyCashFlowBalanceToTotals(totals: FinanceTotals, endBalanceAmount: number | null | undefined): FinanceTotals {
  if (endBalanceAmount == null || !Number.isFinite(Number(endBalanceAmount))) return totals;
  const salesAndReturns = safeAmount(totals.accruals_for_sale);
  const expense = buildFinanceExpenseRows(totals).reduce((sum, row) => sum + safeAmount(row.value), 0);
  const openingDebt = roundMoney(Number(endBalanceAmount) - salesAndReturns - expense);
  return {
    ...totals,
    opening_debt: openingDebt,
  };
}

function readOfficialOpeningDebt(source: Partial<FinanceTotals> | Record<string, unknown> | null | undefined): number | null {
  if (!source) return null;
  const value = (source as any).opening_debt ?? (source as any).opening_balance ?? (source as any).balance_start;
  if (value == null || !Number.isFinite(Number(value))) return null;
  return roundMoney(Number(value));
}

export function applyOfficialOpeningDebtToTotals(
  totals: FinanceTotals,
  officialTotals: Partial<FinanceTotals> | Record<string, unknown> | null | undefined
): FinanceTotals {
  const officialOpeningDebt = readOfficialOpeningDebt(officialTotals);
  if (officialOpeningDebt == null) return totals;
  return {
    ...totals,
    opening_debt: officialOpeningDebt,
  };
}

function readFiniteOfficialMoney(source: Record<string, unknown>, key: keyof FinanceTotals): number | null {
  const value = source[key];
  if (value == null || !Number.isFinite(Number(value))) return null;
  return roundMoney(Number(value));
}

export function applyOfficialFinanceBreakdownToTotals(
  totals: FinanceTotals,
  officialTotals: Partial<FinanceTotals> | Record<string, unknown> | null | undefined
): FinanceTotals {
  if (!officialTotals) return totals;
  const source = officialTotals as Record<string, unknown>;
  const officialKeys: Array<keyof FinanceTotals> = [
    'accruals_for_sale',
    'sale_commission',
    'processing_and_delivery',
    'refunds_and_cancellations',
    'services_amount',
    'compensation_amount',
    'sales_income',
    'partner_program',
    'discount_points',
    'partner_services',
    'ozon_delivery_services',
    'whd_services',
    'credit_services',
    'money_transfer',
    'others_amount',
  ];

  return officialKeys.reduce<FinanceTotals>((next, key) => {
    const value = readFiniteOfficialMoney(source, key);
    if (value == null) return next;
    return { ...next, [key]: value };
  }, totals);
}

async function fetchOfficialTotalsFast(
  storeId: number,
  dateFrom: string,
  dateTo: string
): Promise<Record<string, unknown> | null> {
  const store = await fetchStore(storeId);
  let lastErrorText = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1200 * attempt);
    const resp = await fetch(V3_TOTALS, {
      method: 'POST',
      headers: { 'Client-Id': store.clientId, 'Api-Key': store.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: { from: `${dateFrom}T00:00:00.000Z`, to: `${dateTo}T23:59:59.999Z` },
        transaction_type: 'all',
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (resp.status === 429) {
      lastErrorText = await resp.text().catch(() => '');
      continue;
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Ozon ${resp.status}: ${text.slice(0, 120)}`);
    }

    const json = await resp.json();
    return json.result || json;
  }

  throw new Error(`Ozon 429: ${lastErrorText.slice(0, 120)}`);
}

function roundSignedDisplayValue(value: number): number {
  const rounded = Math.round(Math.abs(safeAmount(value)));
  if (rounded === 0) return 0;
  return value < 0 ? -rounded : rounded;
}

function roundAbsDisplayValue(value: number): number {
  return Math.round(Math.abs(safeAmount(value)));
}

export function calculateDisplayedFinanceNetTotal(totals: FinanceTotals): number {
  const salesAndReturns = safeAmount(totals.accruals_for_sale);
  const expense = buildFinanceExpenseRows(totals).reduce((sum, row) => sum + safeAmount(row.value), 0);
  return roundSignedDisplayValue(salesAndReturns + expense + safeAmount(totals.opening_debt));
}

/**
 * 生成日历月区间（严格不跨月）
 * 例如 2024-06-01 ~ 2024-06-30, 2024-07-01 ~ 2024-07-31 ...
 */
function* calendarMonths(from: string, to: string): Generator<[string, string]> {
  const start = parseLocalDateBoundary(from.slice(0, 7) + '-01', 'start');
  const end = parseLocalDateBoundary(to.slice(0, 10), 'start');
  while (start <= end) {
    const mFrom = formatDateOnly(start);
    const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const lastDay = new Date(nextMonth.getTime() - 86400000);
    const mTo = formatDateOnly(lastDay > end ? end : lastDay);
    yield [mFrom, mTo];
    start.setMonth(start.getMonth() + 1);
  }
}

// ─── API 请求封装 ────────────────────────────────────────

async function fetchStore(storeId: number) {
  const store = await prisma.ozonStore.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`店铺不存在 (ID: ${storeId})`);
  if (!store.clientId || !store.apiKey) throw new Error('店铺未配置 API 密钥');
  return store;
}

async function apiPost(store: any, url: string, body: Record<string, unknown>): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Client-Id': store.clientId, 'Api-Key': store.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (resp.status === 429) {
        const wait = Math.max(5000, (attempt + 1) * 3000 + Math.random() * 2000);
        logger.warn(`[Finance] 429 限流，${(wait / 1000).toFixed(1)}s 后重试 (${attempt + 1}/${MAX_RETRIES})`);
        await sleep(wait);
        continue;
      }

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Ozon ${resp.status}: ${text.slice(0, 200)}`);
      }

      const json = await resp.json();
      return json.result || json;
    } catch (err: any) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        await sleep((attempt + 1) * 2000);
        continue;
      }
    }
  }
  throw lastErr || new Error('API 请求失败');
}

// ─── 列表 API（单个月，支持多页）─────────────────────────

async function fetchMonthPostings(
  store: any,
  dateFrom: string,
  dateTo: string
): Promise<FinancePosting[]> {
  const all: FinancePosting[] = [];
  let page = 1;
  const pageSize = 500;

  while (true) {
    if (page > 1) await sleep(DELAY_MS);

    const result = await apiPost(store, V3_LIST, {
      filter: { date: { from: `${dateFrom}T00:00:00.000Z`, to: `${dateTo}T23:59:59.999Z` } },
      transaction_type: 'all',
      page,
      page_size: pageSize,
    });

    const operations = result?.operations || [];
    all.push(...operations);

    const totalPages = result?.page_count || 0;
    if (page >= totalPages || operations.length === 0) break;
    page++;
  }

  return all;
}

// ─── 全局查询（多个月聚合）───────────────────────────────

export async function getAllPostings(
  storeId: number,
  dateFrom: string,
  dateTo: string
): Promise<{ operations: FinancePosting[]; total: number }> {
  const store = await fetchStore(storeId);
  const all: FinancePosting[] = [];

  for (const [mFrom, mTo] of calendarMonths(dateFrom, dateTo)) {
    await sleep(DELAY_MS / 4);
    try {
      const ops = await fetchMonthPostings(store, mFrom, mTo);
      logger.info(`[Finance] ${mFrom}: ${ops.length} 条`);
      all.push(...ops);
    } catch (err: any) {
      logger.error(`[Finance] ${mFrom} 拉取失败: ${err.message}`);
    }
  }

  return { operations: all, total: all.length };
}

// ─── 统计 API ────────────────────────────────────────────

export async function getFinanceTotals(
  storeId: number,
  dateFrom: string,
  dateTo: string
): Promise<FinanceTotals> {
  const store = await fetchStore(storeId);

  // 逐月聚合 totals
  const totals: FinanceTotals = {
    accruals_for_sale: 0, sale_commission: 0, processing_and_delivery: 0,
    refunds_and_cancellations: 0, services_amount: 0, compensation_amount: 0,
    sales_income: 0, discount_points: 0, partner_program: 0, opening_debt: 0,
    partner_services: 0, ozon_delivery_services: 0, whd_services: 0, credit_services: 0,
    money_transfer: 0, others_amount: 0,
  };

  for (const [mFrom, mTo] of calendarMonths(dateFrom, dateTo)) {
    await sleep(DELAY_MS / 2);
    try {
      const result = await apiPost(store, V3_TOTALS, {
        date: { from: `${mFrom}T00:00:00.000Z`, to: `${mTo}T23:59:59.999Z` },
        transaction_type: 'all',
      });
      totals.accruals_for_sale += result?.accruals_for_sale || 0;
      totals.sale_commission += result?.sale_commission || 0;
      totals.processing_and_delivery += result?.processing_and_delivery || 0;
      totals.refunds_and_cancellations += result?.refunds_and_cancellations || 0;
      totals.services_amount += result?.services_amount || 0;
      totals.compensation_amount += result?.compensation_amount || 0;
      totals.sales_income += result?.sales_income || 0;
      totals.discount_points += result?.discount_points || 0;
      totals.partner_program += result?.partner_program || 0;
      totals.opening_debt += result?.opening_debt || result?.opening_balance || result?.balance_start || 0;
      totals.money_transfer += result?.money_transfer || 0;
      totals.others_amount += (result?.others_amount || 0) + (result?.other_amount || 0);
    } catch (err: any) {
      logger.error(`[Finance Totals] ${mFrom} 失败: ${err.message}`);
    }
  }

  return totals;
}

async function getFinanceTotalsStrict(
  storeId: number,
  dateFrom: string,
  dateTo: string
): Promise<FinanceTotals> {
  const store = await fetchStore(storeId);
  const totals: FinanceTotals = {
    accruals_for_sale: 0, sale_commission: 0, processing_and_delivery: 0,
    refunds_and_cancellations: 0, services_amount: 0, compensation_amount: 0,
    sales_income: 0, discount_points: 0, partner_program: 0, opening_debt: 0,
    partner_services: 0, ozon_delivery_services: 0, whd_services: 0, credit_services: 0,
    money_transfer: 0, others_amount: 0,
  };

  const applyResult = (result: any) => {
    totals.accruals_for_sale += result?.accruals_for_sale || 0;
    totals.sale_commission += result?.sale_commission || 0;
    totals.processing_and_delivery += result?.processing_and_delivery || 0;
    totals.refunds_and_cancellations += result?.refunds_and_cancellations || 0;
    totals.services_amount += result?.services_amount || 0;
    totals.compensation_amount += result?.compensation_amount || 0;
    totals.sales_income += result?.sales_income || 0;
    totals.discount_points += result?.discount_points || 0;
    totals.partner_program += result?.partner_program || 0;
    const officialOpeningDebt = readOfficialOpeningDebt(result);
    if (officialOpeningDebt != null && totals.opening_debt === 0) {
      totals.opening_debt = officialOpeningDebt;
    }
    totals.money_transfer += result?.money_transfer || 0;
    totals.others_amount += (result?.others_amount || 0) + (result?.other_amount || 0);
  };
  const finalizeTotals = () => {
    for (const key of Object.keys(totals) as Array<keyof FinanceTotals>) {
      totals[key] = roundMoney(safeAmount(totals[key]));
    }
    return totals;
  };

  try {
    const result = await apiPost(store, V3_TOTALS, {
      date: { from: `${dateFrom}T00:00:00.000Z`, to: `${dateTo}T23:59:59.999Z` },
      transaction_type: 'all',
    });
    applyResult(result);
    return finalizeTotals();
  } catch (err: any) {
    logger.warn(`[Finance Totals] 整段历史汇总失败，尝试按月拆分: ${err.message}`);
  }

  for (const [mFrom, mTo] of calendarMonths(dateFrom, dateTo)) {
    await sleep(DELAY_MS);
    const result = await apiPost(store, V3_TOTALS, {
      date: { from: `${mFrom}T00:00:00.000Z`, to: `${mTo}T23:59:59.999Z` },
      transaction_type: 'all',
    });
    applyResult(result);
  }

  return finalizeTotals();
}

async function getFirstFinanceDate(storeId: number): Promise<string | null> {
  const first = await prisma.financeAccrual.findFirst({
    where: { storeId },
    orderBy: { operationDate: 'asc' },
    select: { operationDate: true },
  });
  return first?.operationDate ? formatDateOnly(first.operationDate) : null;
}

async function computeOpeningDebtFromLocalHistory(storeId: number, dateFrom: string): Promise<number> {
  const firstDate = await getFirstFinanceDate(storeId);
  if (!firstDate || firstDate >= dateFrom) return 0;
  const previousDate = previousLocalDate(dateFrom);
  const totals = await computeTotalsFromLocal(storeId, firstDate, previousDate);
  return calculateDisplayedFinanceNetTotal(totals);
}

export async function enrichTotalsWithOpeningDebt(
  storeId: number,
  dateFrom: string,
  dateTo: string,
  totals: FinanceTotals
): Promise<FinanceTotals> {
  const openingDebt = await computeOpeningDebtFromLocalHistory(storeId, dateFrom);
  const localEnriched = { ...totals, opening_debt: openingDebt };

  try {
    const officialTotals = await fetchOfficialTotalsFast(storeId, dateFrom, dateTo);
    const withOpeningDebt = applyOfficialOpeningDebtToTotals(localEnriched, officialTotals);
    return applyOfficialFinanceBreakdownToTotals(withOpeningDebt, officialTotals);
  } catch (err: any) {
    logger.warn(`[Finance Totals] 官方汇总获取失败，使用本地历史反推值: ${err.message}`);
    return localEnriched;
  }
}

// ─── 智能探测 + 并行同步 ────────────────────────────────

/**
 * 获取同步下界日期。
 * 用 Ozon 平台真实数据推断店铺最早活跃时间，避免用本地 createdAt（那是添加时间）。
 *
 * 优先级：
 *   1) 最早产品 ozonCreatedAt（Ozon 真实数据）
 *   2) 最早订单 orderCreatedAt（兜底）
 *   3) 传入的 fallbackDate
 */
async function getSyncLowerBound(storeId: number, fallbackDate: string): Promise<string> {
  const fb = fallbackDate.slice(0, 10);

  // 1) 取最早产品的 Ozon 创建时间（Product 通过 WarehouseItem 关联 Store）
  const earliestWi = await prisma.warehouseItem.findFirst({
    where: {
      ozonStoreId: storeId,
      product: { ozonCreatedAt: { not: null } },
    },
    select: { product: { select: { ozonCreatedAt: true } } },
    orderBy: { product: { ozonCreatedAt: 'asc' } },
  });
  if (earliestWi?.product?.ozonCreatedAt) {
    const pd = earliestWi.product.ozonCreatedAt.toISOString().slice(0, 10);
    if (pd > fb) {
      logger.info(`[Finance Sync] 下界调整为最早产品日期: ${pd}`);
      return pd;
    }
  }

  // 2) 取最早订单的 Ozon 创建时间
  const earliestOrder = await prisma.ozonOrder.findFirst({
    where: { ozonStoreId: storeId, orderCreatedAt: { not: null } },
    select: { orderCreatedAt: true },
    orderBy: { orderCreatedAt: 'asc' },
  });
  if (earliestOrder?.orderCreatedAt) {
    const od = earliestOrder.orderCreatedAt.toISOString().slice(0, 10);
    if (od > fb) {
      logger.info(`[Finance Sync] 下界调整为最早订单日期: ${od}`);
      return od;
    }
  }

  return fb;
}

/**
 * 用 totals 端点反向探测活跃月份。
 * 从 dateTo 往前逐月调用 totals API，直到连续 2 个月无数据。
 * totals 端点无分页，单次 < 100ms，远快于 list API。
 *
 * @returns 有数据的月份数组 [[mFrom, mTo], ...]，按时间正序
 */
async function probeActiveMonths(
  store: any,
  dateFrom: string,
  dateTo: string
): Promise<Array<[string, string]>> {
  const active: Array<[string, string]> = [];
  const allMonths: Array<[string, string]> = [];

  // 收集所有候选月份（正序）
  for (const m of calendarMonths(dateFrom, dateTo)) {
    allMonths.push(m);
  }

  if (allMonths.length === 0) return active;

  // 反向探测：从最近月开始，连续 2 个空月则停止
  let emptyStreak = 0;
  for (let i = allMonths.length - 1; i >= 0; i--) {
    const [mFrom, mTo] = allMonths[i];
    await sleep(200); // 轻量延迟，避免限流

    try {
      const result = await apiPost(store, V3_TOTALS, {
        date: { from: `${mFrom}T00:00:00.000Z`, to: `${mTo}T23:59:59.999Z` },
        transaction_type: 'all',
      });

      const hasData = (result?.accruals_for_sale || 0) !== 0
        || (result?.sale_commission || 0) !== 0
        || (result?.processing_and_delivery || 0) !== 0
        || (result?.refunds_and_cancellations || 0) !== 0
        || (result?.services_amount || 0) !== 0
        || (result?.compensation_amount || 0) !== 0
        || (result?.money_transfer || 0) !== 0
        || (result?.others_amount || 0) !== 0;

      if (hasData) {
        active.unshift([mFrom, mTo]); // 插入到开头（保持正序）
        emptyStreak = 0;
      } else {
        emptyStreak++;
        if (emptyStreak >= 2) {
          logger.info(`[Finance Probe] 连续 ${emptyStreak} 个空月，探测停止于 ${mFrom}`);
          break;
        }
      }
    } catch (err: any) {
      logger.warn(`[Finance Probe] ${mFrom} totals 失败: ${err.message}`);
      emptyStreak++;
      if (emptyStreak >= 2) break;
    }
  }

  // 确保最近一个月总是被包含（数据可能在当前月持续产生）
  if (active.length === 0 && allMonths.length > 0) {
    const last = allMonths[allMonths.length - 1];
    active.push(last);
    logger.info(`[Finance Probe] 无活跃月发现，保留最近月: ${last[0]}`);
  }

  return active;
}

/**
 * 并行批量 upsert 财务记录到数据库
 */
async function batchUpsertPostings(
  storeId: number,
  ops: FinancePosting[]
): Promise<number> {
  if (ops.length === 0) return 0;

  const upserts = ops.map(op => {
    const classified = classifyFinanceOperation(op);
    const posting = (op as any).posting || {};
    const postingNumber = op.posting_number || posting.posting_number || null;
    const deliverySchema = op.delivery_schema || posting.delivery_schema || null;

    return prisma.financeAccrual.upsert({
      where: { storeId_operationId: { storeId, operationId: String(op.operation_id) } },
      create: {
        storeId,
        operationId: String(op.operation_id),
        operationType: op.operation_type || null,
        operationTypeName: op.operation_type_name || null,
        operationDate: new Date(op.operation_date),
        accrualsForSale: classified.accruals_for_sale,
        amount: op.amount || 0,
        saleCommission: classified.sale_commission,
        deliveryCharge: classified.processing_and_delivery,
        returnDeliveryCharge: op.return_delivery_charge || 0,
        servicesAmount: classified.services_amount + classified.partner_services + classified.ozon_delivery_services + classified.whd_services + classified.credit_services,
        compensationAmount: classified.compensation_amount,
        othersAmount: classified.others_amount,
        type: op.type || null,
        postingNumber,
        deliverySchema,
        itemsJson: op.items?.length ? op.items : undefined,
        servicesJson: op.services?.length ? op.services : undefined,
        rawData: op as any,
      },
      update: {
        operationType: op.operation_type || null,
        operationTypeName: op.operation_type_name || null,
        accrualsForSale: classified.accruals_for_sale,
        amount: op.amount || 0,
        saleCommission: classified.sale_commission,
        deliveryCharge: classified.processing_and_delivery,
        returnDeliveryCharge: op.return_delivery_charge || 0,
        servicesAmount: classified.services_amount + classified.partner_services + classified.ozon_delivery_services + classified.whd_services + classified.credit_services,
        compensationAmount: classified.compensation_amount,
        othersAmount: classified.others_amount,
        operationDate: new Date(op.operation_date),
        type: op.type || null,
        postingNumber,
        deliverySchema,
        itemsJson: op.items?.length ? op.items : undefined,
        servicesJson: op.services?.length ? op.services : undefined,
        rawData: op as any,
      },
    });
  });

  await Promise.all(upserts);
  return ops.length;
}

// ─── 全量/增量同步到数据库 ────────────────────────────────

/**
 * 同步逻辑（优化版）：
 * 
 * 1. 增量模式（DB 已有数据）：
 *    - 只同步 lastSyncDate 所在月 ~ dateTo（通常 1-2 个月）
 *    - 直接拉 list API，不做探测
 * 
 * 2. 全量模式（DB 无数据，首次同步）：
 *    - Step 1: 取店铺创建日期作绝对下界（不查店铺存在前的月份）
 *    - Step 2: totals 端点反向探测活跃月份（跳过空月，200ms/月）
 *    - Step 3: 并行拉取活跃月的 list 数据（3 路并发，1.2s/批）
 * 
 * 效果：全量同步从 ~30s（串行遍历 24 个月）降到 ~5-8s
 */
export async function syncAllToDatabase(
  storeId: number,
  dateFrom: string,
  dateTo: string,
  userId?: number | null
): Promise<{ stored: number; months: number; mode: string; probed: number; skipped: number }> {
  const store = await fetchStore(storeId);
  let totalStored = 0;

  // 判断是否增量
  const latest = await prisma.financeAccrual.findFirst({
    where: { storeId }, orderBy: { operationDate: 'desc' }, select: { operationDate: true },
  });

  let syncFrom = dateFrom;
  let mode = 'full';
  let probedMonths = 0;
  let skippedMonths = 0;

  if (latest?.operationDate) {
    // ===== 增量模式：快速路径 =====
    const lastDate = latest.operationDate;
    const lastMonthStart = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-01`;
    const requestedStart = dateFrom.slice(0, 10);
    if (requestedStart < lastMonthStart) {
      syncFrom = requestedStart;
      mode = 'range_refresh';
      logger.info(`[Finance Sync] 历史范围刷新模式，从 ${syncFrom} 开始`);
    } else {
      syncFrom = lastMonthStart;
      mode = 'incremental';
      logger.info(`[Finance Sync] 增量模式，从 ${syncFrom} 开始`);
    }

    const months: Array<[string, string]> = [];
    for (const m of calendarMonths(syncFrom, dateTo)) months.push(m);

    // 增量月份少，直接串行拉取
    for (const [mFrom, mTo] of months) {
      await sleep(DELAY_MS);
      try {
        const ops = await fetchMonthPostings(store, mFrom, mTo);
        const stored = await batchUpsertPostings(storeId, ops);
        totalStored += stored;
        logger.info(`[Finance Sync] ${storeId} ${mFrom}: ${stored} 条`);
      } catch (err: any) {
        logger.error(`[Finance Sync] ${storeId} ${mFrom} 失败: ${err.message}`);
      }
    }

  } else {
    // ===== 全量模式：智能探测 + 并行拉取 =====
    // Step 1: 取店铺创建日期作下界
    const lowerBound = await getSyncLowerBound(storeId, dateFrom);
    logger.info(`[Finance Sync] 全量模式，范围: ${lowerBound} ~ ${dateTo.slice(0, 10)}`);

    // Step 2: totals 端点反向探测活跃月份
    const activeMonths = await probeActiveMonths(store, lowerBound, dateTo.slice(0, 10));
    probedMonths = activeMonths.length;

    // 计算跳过的月份数
    const allCandidateMonths = [...calendarMonths(lowerBound, dateTo.slice(0, 10))];
    skippedMonths = allCandidateMonths.length - activeMonths.length;

    logger.info(`[Finance Sync] 探测完成: ${activeMonths.length} 活跃月, 跳过 ${skippedMonths} 空月`);
    if (activeMonths.length > 0) {
      logger.info(`[Finance Sync] 活跃范围: ${activeMonths[0][0]} ~ ${activeMonths[activeMonths.length - 1][0]}`);
    }

    // Step 3: 并行拉取活跃月数据（3 路并发）
    const PARALLEL = 3;
    for (let i = 0; i < activeMonths.length; i += PARALLEL) {
      const batch = activeMonths.slice(i, i + PARALLEL);
      await sleep(DELAY_MS); // 每批之间延迟

      const results = await Promise.allSettled(
        batch.map(([mFrom, mTo]) => fetchMonthPostings(store, mFrom, mTo))
      );

      // 批量写入 DB
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const [mFrom] = batch[j];
        if (result.status === 'fulfilled') {
          const stored = await batchUpsertPostings(storeId, result.value);
          totalStored += stored;
          logger.info(`[Finance Sync] ${storeId} ${mFrom}: ${stored} 条`);
        } else {
          logger.error(`[Finance Sync] ${storeId} ${mFrom} 失败: ${result.reason?.message || result.reason}`);
        }
      }
    }
  }

  await prisma.syncLog.create({
    data: {
      ozonStoreId: storeId,
      userId: userId || null,
      syncType: 'finance',
      syncedCount: totalStored,
      updatedCount: 0,
      deletedCount: 0,
      status: 'success',
      message: `财务同步成功，${mode === 'incremental' ? '增量' : mode === 'range_refresh' ? '历史范围刷新' : '全量'}写入 ${totalStored} 条记录`,
    },
  });

  logger.info(`[Finance Sync] 店铺 ${storeId} ${mode} 完成: ${totalStored} 条 (活跃 ${probedMonths} 月, 跳过 ${skippedMonths} 月)`);
  return { stored: totalStored, months: probedMonths, mode, probed: probedMonths, skipped: skippedMonths };
}

export async function recordFinanceSyncFailure(storeId: number, userId?: number | null, message?: string) {
  await prisma.syncLog.create({
    data: {
      ozonStoreId: storeId,
      userId: userId || null,
      syncType: 'finance',
      syncedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      status: 'failed',
      message: message || '财务同步失败',
    },
  });
}

// ─── 从本地数据库查询 ────────────────────────────────────

export async function getLocalPostings(
  storeId: number,
  params: {
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    postingNumber?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const page = Math.max(params.page || 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize || 20, 1), 1000);
  const where: any = { storeId };

  if (params.dateFrom && params.dateTo) {
    where.operationDate = buildOperationDateWhere(params.dateFrom, params.dateTo);
  }
  if (params.type) where.type = params.type;
  if (params.postingNumber) where.postingNumber = params.postingNumber;

  const [rows, total] = await Promise.all([
    prisma.financeAccrual.findMany({ where, orderBy: { operationDate: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.financeAccrual.count({ where }),
  ]);

  return {
    operations: rows.map(mapFinanceRow),
    total,
    page,
    pageSize,
  };
}

/** 将数据库行映射为 API 响应对象 */
function mapFinanceRow(r: any) {
  const opTypeName = r.operationTypeName || '';
  const deliverySchema = r.deliverySchema || '';
  const rawData = r.rawData as any;
  const postingNumber = r.postingNumber || rawData?.posting?.posting_number || null;
  const labels = financeLabels(rowToOperationLike(r));
  return {
    operation_id: parseInt(r.operationId, 10) || 0,
    operation_date: r.operationDate?.toISOString?.() || r.operationDate,
    operation_type: r.operationType || '',
    operation_type_name: opTypeName,
    operation_type_name_zh: translateOpType(opTypeName),
    service_group_zh: labels.service_group_zh,
    accrual_type_zh: labels.accrual_type_zh,
    accruals_for_sale: r.accrualsForSale,
    amount: r.amount,
    sale_commission: r.saleCommission,
    delivery_charge: r.deliveryCharge,
    return_delivery_charge: r.returnDeliveryCharge,
    type: r.type || '',
    posting_number: postingNumber,
    delivery_schema: deliverySchema,
    delivery_schema_zh: translateDeliverySchema(deliverySchema),
    items: (r.itemsJson as any) || undefined,
    services: (r.servicesJson as any) || undefined,
  };
}

/**
 * 按 posting_number 分组返回（Ozon 真实结构）
 * - 同一 posting_number 的多个 operation 归为一组
 * - 只有一个 operation 的 posting 为独立行
 * - 分组内的第一条有 product 信息，其余为子项（ID 显示 "-"）
 */
export async function getGroupedPostings(
  storeId: number,
  params: {
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    postingNumber?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const page = Math.max(params.page || 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize || 50, 1), 500);
  const where: any = { storeId };

  if (params.dateFrom && params.dateTo) {
    where.operationDate = buildOperationDateWhere(params.dateFrom, params.dateTo);
  }
  if (params.type) where.type = params.type;
  if (params.postingNumber) where.postingNumber = params.postingNumber;

  // 拉取所有符合条件的记录（财务报告数据集通常不会超过几千条）
  const allRows = await prisma.financeAccrual.findMany({
    where,
    orderBy: [{ postingNumber: 'asc' }, { operationDate: 'desc' }],
  });

  // 按 posting_number 分组。Ozon 只把订单主记录展开为销售/佣金/合作伙伴服务明细；
  // 同一 posting 下的真实服务费 operation 仍作为独立顶层记录展示。
  const groupMap = new Map<string, any[]>();
  const standaloneList: any[] = [];

  for (const r of allRows) {
    const pn = r.postingNumber || '';
    const isOrderRow = (r.type || '').toLowerCase() === 'orders' && Number(r.accrualsForSale || 0) > 0;
    if (!pn || !isOrderRow) {
      standaloneList.push(r);
    } else {
      if (!groupMap.has(pn)) groupMap.set(pn, []);
      groupMap.get(pn)!.push(r);
    }
  }

  // 构建展示条目：独立行 + 分组
  interface GroupItem {
    _groupKey: string;
    isGroup: boolean;
    main?: any;
    children?: any[];
    operation?: any;
  }

  const allItems: GroupItem[] = [];

  // 分组条目
  for (const [pn, ops] of groupMap) {
    const mainRow = ops.find(op => (op.type || '').toLowerCase() === 'orders' && Number(op.accrualsForSale || 0) > 0) || ops[0];
    const derivedChildren = buildOrderDisplayChildren(mainRow);
    if (ops.length === 1 && derivedChildren.length === 0) {
      allItems.push({ _groupKey: pn, isGroup: false, operation: mapFinanceRow(ops[0]) });
    } else {
      allItems.push({
        _groupKey: pn,
        isGroup: true,
        main: mapFinanceRow(mainRow),
        children: derivedChildren,
      });
    }
  }

  // 独立条目（无 posting_number）
  for (const op of standaloneList) {
    allItems.push({ _groupKey: '', isGroup: false, operation: mapFinanceRow(op) });
  }

  // 按 main/operation 的 operation_date 降序排序
  allItems.sort((a, b) => {
    const da = a.main?.operation_date || a.operation?.operation_date || '';
    const db = b.main?.operation_date || b.operation?.operation_date || '';
    return db.localeCompare(da);
  });

  const totalItems = allItems.length;
  const totalOps = allRows.length;

  // 分页
  const start = (page - 1) * pageSize;
  const pagedItems = allItems.slice(start, start + pageSize);

  return {
    items: pagedItems,
    total: totalItems,
    totalOperations: totalOps,
    page,
    pageSize,
  };
}

/** 从本地数据库按类型分组聚合 */
export async function aggregateByType(
  storeId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<Array<{ type: string; operation_type_name: string; accruals_for_sale: number; amount: number; count: number }>> {
  const where: any = { storeId };
  if (dateFrom && dateTo) {
    where.operationDate = buildOperationDateWhere(dateFrom, dateTo);
  }

  const groups = await prisma.financeAccrual.groupBy({
    by: ['type', 'operationTypeName'],
    where,
    _sum: { accrualsForSale: true, amount: true },
    _count: { id: true },
  });

  return groups.map(g => {
    const opTypeName = g.operationTypeName || g.type || '其他';
    return {
      type: g.type || 'other',
      operation_type_name: opTypeName,
      operation_type_name_zh: translateOpType(opTypeName),
      accruals_for_sale: g._sum.accrualsForSale || 0,
      amount: g._sum.amount || 0,
      count: g._count.id,
    };
  });
}

function rowToOperationLike(row: any): FinanceOperationLike {
  const raw = row.rawData as any;
  if (raw && typeof raw === 'object') {
    return {
      ...raw,
      operation_type: raw.operation_type ?? row.operationType,
      operation_type_name: raw.operation_type_name ?? row.operationTypeName,
      type: raw.type ?? row.type,
      accruals_for_sale: raw.accruals_for_sale ?? row.accrualsForSale,
      amount: raw.amount ?? row.amount,
      sale_commission: raw.sale_commission ?? row.saleCommission,
      delivery_charge: raw.delivery_charge ?? row.deliveryCharge,
      return_delivery_charge: raw.return_delivery_charge ?? row.returnDeliveryCharge,
      services: raw.services ?? row.servicesJson,
    };
  }

  return {
    operation_type: row.operationType,
    operation_type_name: row.operationTypeName,
    type: row.type,
    accruals_for_sale: row.accrualsForSale,
    amount: row.amount,
    sale_commission: row.saleCommission,
    delivery_charge: row.deliveryCharge,
    return_delivery_charge: row.returnDeliveryCharge,
    services_amount: row.servicesAmount,
    compensation_amount: row.compensationAmount,
    others_amount: row.othersAmount,
    services: row.servicesJson,
  };
}

export function estimatePartnerProgramFromOrderProduct(product: any): number {
  const quantity = safeAmount(product?.quantity) || 1;
  const customerPrice = safeAmount(product?.customer_price);
  const sellerPrice = safeAmount(product?.price);
  if (customerPrice <= sellerPrice || sellerPrice <= 0) return 0;

  // Ozon sometimes stores seller price in a different scale/currency in order raw data.
  // Small uplifts map to "partner program"; large gaps remain part of discount points.
  if (customerPrice / sellerPrice > 2) return 0;
  return roundMoney((customerPrice - sellerPrice) * quantity);
}

async function applyOrderFinancialDataToTotals(
  storeId: number,
  summary: FinanceTotals,
  rows: any[]
): Promise<FinanceTotals> {
  const orderPostingNumbers = new Set(
    rows
      .filter(row => (row.type || '').toLowerCase() === 'orders' && safeAmount(row.accrualsForSale) > 0)
      .map(row => row.postingNumber)
      .filter(Boolean)
  );
  if (orderPostingNumbers.size === 0) return summary;

  const orders = await prisma.ozonOrder.findMany({
    where: {
      ozonStoreId: storeId,
      postingNumber: { in: [...orderPostingNumbers] },
    },
    select: { postingNumber: true, raw: true },
  });

  const usablePostings = new Set<string>();
  let orderSalesIncome = 0;
  let partnerProgram = 0;
  for (const order of orders) {
    const products = (order.raw as any)?.financial_data?.products;
    if (!Array.isArray(products) || products.length === 0) continue;
    let postingIncome = 0;
    let postingPartnerProgram = 0;
    for (const product of products) {
      const quantity = safeAmount(product?.quantity) || 1;
      postingIncome += safeAmount(product?.customer_price) * quantity;
      postingPartnerProgram += estimatePartnerProgramFromOrderProduct(product);
    }
    if (postingIncome <= 0) continue;
    usablePostings.add(order.postingNumber);
    orderSalesIncome += postingIncome;
    partnerProgram += postingPartnerProgram;
  }

  if (usablePostings.size !== orderPostingNumbers.size || orderSalesIncome <= 0) {
    return summary;
  }

  summary.sales_income = roundMoney(orderSalesIncome);
  summary.partner_program = roundMoney(summary.partner_program + partnerProgram);
  summary.discount_points = roundMoney(Math.max(0, summary.accruals_for_sale - orderSalesIncome - partnerProgram));
  return summary;
}

function financeLabels(op: FinanceOperationLike): { service_group_zh: string; accrual_type_zh: string } {
  const text = operationText(op);
  if ((op.type || '').toLowerCase() === 'orders' && safeAmount(op.accruals_for_sale) > 0) {
    return { service_group_zh: '销售', accrual_type_zh: '收入' };
  }
  if (includesAnyText(text, ['AcceleratedProductReviews', 'Ускоренный сбор отзывов', 'Быстрый сбор отзывов'])) {
    return { service_group_zh: '推广和广告', accrual_type_zh: '快速收集评价' };
  }
  if (includesAnyText(text, ['AgencyFeeAggregator', 'транспортно-экспедиционных'])) {
    return { service_group_zh: '配送服务', accrual_type_zh: 'Ozon代理佣金' };
  }
  if (includesAnyText(text, ['Acquiring', 'Эквайринг', 'Оплата эквайринга'])) {
    return { service_group_zh: '合作伙伴服务', accrual_type_zh: '收单业务' };
  }
  if (includesAnyText(text, ['LastMile', 'RedistributionLastMile', 'MarketplaceServiceItemRedistributionLastMile'])) {
    return { service_group_zh: '合作伙伴服务', accrual_type_zh: '合作伙伴交付商品' };
  }
  return { service_group_zh: translateOpType(op.operation_type_name || ''), accrual_type_zh: translateOpType(op.operation_type_name || '') };
}

function buildOrderDisplayChildren(row: any): any[] {
  const main = mapFinanceRow(row);
  const op = rowToOperationLike(row);
  if ((op.type || '').toLowerCase() !== 'orders' || safeAmount(op.accruals_for_sale) <= 0) return [];

  const children: any[] = [];
  const base = {
    ...main,
    operation_id: 0,
    posting_number: '',
    amount: 0,
    is_derived: true,
  };

  if (safeAmount(op.accruals_for_sale) !== 0) {
    children.push({
      ...base,
      amount: safeAmount(op.accruals_for_sale),
      service_group_zh: '销售',
      accrual_type_zh: '收入',
      operation_type_name_zh: '收入',
    });
  }

  if (safeAmount(op.sale_commission) !== 0) {
    children.push({
      ...base,
      amount: safeAmount(op.sale_commission),
      service_group_zh: 'Ozon代理佣金',
      accrual_type_zh: '销售代理佣金',
      operation_type_name_zh: '销售代理佣金',
    });
  }

  const lastMile = sumServices(op, ['LastMile', 'RedistributionLastMile', 'MarketplaceServiceItemRedistributionLastMile']);
  if (lastMile !== 0) {
    children.push({
      ...base,
      amount: roundMoney(lastMile),
      service_group_zh: '合作伙伴服务',
      accrual_type_zh: '合作伙伴交付商品',
      operation_type_name_zh: '合作伙伴交付商品',
    });
  }

  const deliveryCharge = safeAmount(op.delivery_charge) + safeAmount(op.return_delivery_charge);
  if (deliveryCharge !== 0) {
    children.push({
      ...base,
      amount: roundMoney(deliveryCharge),
      service_group_zh: '配送服务',
      accrual_type_zh: '配送服务',
      operation_type_name_zh: '配送服务',
    });
  }

  return children;
}

/** 从本地数据库计算统计汇总 */
export async function computeTotalsFromLocal(
  storeId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<FinanceTotals> {
  const where: any = { storeId };
  if (dateFrom && dateTo) {
    where.operationDate = buildOperationDateWhere(dateFrom, dateTo);
  }

  const rows = await prisma.financeAccrual.findMany({
    where,
    select: {
      operationType: true,
      operationTypeName: true,
      type: true,
      accrualsForSale: true,
      amount: true,
      saleCommission: true,
      deliveryCharge: true,
      returnDeliveryCharge: true,
      servicesAmount: true,
      compensationAmount: true,
      othersAmount: true,
      postingNumber: true,
      servicesJson: true,
      rawData: true,
    },
  });

  const summary = summarizeFinanceOperations(rows.map(rowToOperationLike));
  return applyOrderFinancialDataToTotals(storeId, summary, rows);
}

/** 获取同步元信息 */
export async function getSyncMeta(storeId: number) {
  const [latest, first, count] = await Promise.all([
    prisma.financeAccrual.findFirst({
      where: { storeId }, orderBy: { operationDate: 'desc' }, select: { operationDate: true },
    }),
    prisma.financeAccrual.findFirst({
      where: { storeId }, orderBy: { operationDate: 'asc' }, select: { operationDate: true },
    }),
    prisma.financeAccrual.count({ where: { storeId } }),
  ]);
  return {
    lastSyncDate: latest?.operationDate || null,
    firstRecordDate: first?.operationDate ? formatDateOnly(first.operationDate) : null,
    totalRecords: count,
  };
}

export async function getFinanceSyncLogs(storeId: number, page: number, pageSize: number) {
  const where = { ozonStoreId: storeId, syncType: 'finance' };
  const [logs, total] = await Promise.all([
    prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { username: true, nickname: true } },
        ozonStore: { select: { name: true } },
      },
    }),
    prisma.syncLog.count({ where }),
  ]);

  return {
    list: logs.map(log => ({
      id: log.id,
      syncType: log.syncType,
      status: log.status,
      syncedCount: log.syncedCount,
      updatedCount: log.updatedCount,
      deletedCount: log.deletedCount,
      message: log.message || '',
      userName: log.user?.nickname || log.user?.username || '系统',
      storeName: log.ozonStore?.name || '未知店铺',
      createdAt: log.createdAt?.toISOString() || '',
    })),
    total,
    page,
    pageSize,
  };
}
