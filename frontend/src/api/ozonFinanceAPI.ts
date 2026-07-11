import request from './request';

// ─── 类型 ────────────────────────────────────────────────

export interface FinanceTotals {
  accruals_for_sale: number;
  sale_commission: number;
  processing_and_delivery: number;
  refunds_and_cancellations: number;
  services_amount: number;
  compensation_amount: number;
  sales_income?: number;
  discount_points?: number;
  partner_program?: number;
  opening_debt?: number;
  partner_services?: number;
  ozon_delivery_services?: number;
  whd_services?: number;
  credit_services?: number;
  money_transfer: number;
  others_amount: number;
}

export interface FinanceExpenseRow {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface FinanceExpenseSplit {
  positiveAmount: number;
  negativeAmount: number;
}

export interface FinanceCategory {
  type: string;
  operation_type_name: string;
  operation_type_name_zh?: string;
  service_group_zh?: string;
  accrual_type_zh?: string;
  accruals_for_sale: number;
  count: number;
}

export interface FinancePosting {
  operation_id: number;
  operation_date: string;
  operation_type: string;
  operation_type_name: string;
  operation_type_name_zh?: string;
  accruals_for_sale: number;
  amount: number;
  sale_commission: number;
  delivery_charge: number;
  return_delivery_charge: number;
  type: string;
  posting_number?: string;
  delivery_schema?: string;
  delivery_schema_zh?: string;
  items?: { name: string; sku: number }[];
  services?: { name: string; price: number }[];
  is_derived?: boolean;
}

/** 分组条目（对齐 Ozon 分组结构） */
export interface PostingGroupItem {
  _groupKey: string;
  isGroup: boolean;
  main?: FinancePosting;
  children?: FinancePosting[];
  operation?: FinancePosting;
}

export interface SyncMeta {
  lastSyncDate: string | null;
  firstRecordDate: string | null;
  totalRecords: number;
}

export interface FinanceTotalsResponse {
  totals: FinanceTotals;
  categories: FinanceCategory[];
  expenseRows: FinanceExpenseRow[];
  expenseSplit?: FinanceExpenseSplit;
  sync: SyncMeta;
}

export interface FinanceSyncLogItem {
  id: number;
  status: 'success' | 'failed';
  syncedCount: number;
  updatedCount: number;
  deletedCount: number;
  message: string;
  userName: string;
  storeName: string;
  createdAt: string;
}

export interface FinanceSyncLogListResponse {
  list: FinanceSyncLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── API ─────────────────────────────────────────────────

export const ozonFinanceAPI = {
  /** 统计汇总（含分类明细） */
  getTotals: (storeId: number, date_from: string, date_to: string) =>
    request.get<FinanceTotalsResponse>(`/ozon/finance/${storeId}/totals`, { params: { date_from, date_to } }),

  /** 列表明细 */
  getPostings: (storeId: number, params: {
    date_from: string; date_to: string; type?: string;
    posting_number?: string; page?: number; page_size?: number;
  }) => request.get(`/ozon/finance/${storeId}/postings`, { params }),

  /** 同步数据 */
  sync: (storeId: number, date_from: string, date_to: string) =>
    request.post(`/ozon/finance/${storeId}/sync`, { date_from, date_to }),

  /** 同步状态 */
  getSyncStatus: (storeId: number) =>
    request.get(`/ozon/finance/${storeId}/sync-status`),

  /** 同步日志 */
  getSyncLogs: (storeId: number, page = 1, pageSize = 10) =>
    request.get<FinanceSyncLogListResponse>(`/ozon/finance/${storeId}/sync-logs`, { params: { page, pageSize } }),
};
