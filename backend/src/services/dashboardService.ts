import prisma from '../config/database';

export type DashboardProductStatus = 'selling' | 'pending' | 'error' | 'archived' | 'autoArchived';

export interface DashboardSummary {
  stats: {
    productSupplyTotal: number;
    averageProductPrice: number;
    storeCount: number;
    totalSalesAmount: number;
    currency: string;
  };
  orderTrend: Array<{
    date: string;
    label: string;
    orderCount: number;
    salesAmount: number;
  }>;
  productStatus: Record<DashboardProductStatus, number>;
  recentSyncLogs: Array<{
    id: number;
    syncType: string;
    status: string;
    message: string;
    storeName: string;
    operatorName: string;
    createdAt: string;
  }>;
  actionItems: Array<{
    key: string;
    label: string;
    value: number;
    description: string;
    level: 'info' | 'warning' | 'danger';
  }>;
  updatedAt: string;
}

interface DashboardProductLike {
  isAutoArchived?: boolean | null;
  isArchived?: boolean | null;
  hasErrors?: boolean | null;
  hasWarnings?: boolean | null;
  statusName?: string | null;
  totalStock?: number | null;
  ozonSku?: string | number | null;
}

interface DashboardOrderLike {
  orderCreatedAt?: Date | string | null;
  inProcessAt?: Date | string | null;
  totalPrice?: number | null;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

const dateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatDateLabel = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const addDays = (date: Date, days: number) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

export const classifyDashboardProductStatus = (product: DashboardProductLike): DashboardProductStatus => {
  const statusName = product.statusName || '';
  const hasSku = product.ozonSku !== null && product.ozonSku !== undefined && product.ozonSku !== '' && product.ozonSku !== '0' && product.ozonSku !== 0;
  const isSellingStatus = statusName === 'Продается' || statusName === '袩褉芯写邪械褌褋褟';
  const isReadyStatus = statusName.includes('Готов к продаже') || statusName.includes('准备销售');
  const isNotForSaleStatus = statusName.includes('Не продается') || statusName.includes('不出售');

  if (product.isAutoArchived) return 'autoArchived';
  if (product.isArchived) return 'archived';
  if (!hasSku) return 'error';
  if (product.hasErrors || isNotForSaleStatus) return 'error';
  if (isSellingStatus) return 'selling';
  if ((product.totalStock || 0) === 0 || isReadyStatus || product.hasWarnings) return 'pending';
  return 'selling';
};

export const summarizeProductStatuses = (products: DashboardProductLike[]): Record<DashboardProductStatus, number> => {
  const summary: Record<DashboardProductStatus, number> = {
    selling: 0,
    pending: 0,
    error: 0,
    archived: 0,
    autoArchived: 0,
  };

  for (const product of products) {
    summary[classifyDashboardProductStatus(product)] += 1;
  }

  return summary;
};

export const buildLastSevenDaysOrderTrend = (now: Date, orders: DashboardOrderLike[]) => {
  const start = addDays(startOfDay(now), -6);
  const buckets = new Map<string, { date: string; label: string; orderCount: number; salesAmount: number }>();

  for (let i = 0; i < 7; i++) {
    const current = addDays(start, i);
    buckets.set(dateKey(current), {
      date: dateKey(current),
      label: formatDateLabel(current),
      orderCount: 0,
      salesAmount: 0,
    });
  }

  for (const order of orders) {
    const rawDate = order.orderCreatedAt || order.inProcessAt;
    if (!rawDate) continue;

    const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(date.getTime())) continue;

    const bucket = buckets.get(dateKey(date));
    if (!bucket) continue;

    bucket.orderCount += 1;
    bucket.salesAmount += Number(order.totalPrice || 0);
  }

  return Array.from(buckets.values()).map(item => ({
    ...item,
    salesAmount: Number(item.salesAmount.toFixed(2)),
  }));
};

export async function getDashboardSummary(userId: number): Promise<DashboardSummary> {
  const now = new Date();
  const trendStart = addDays(startOfDay(now), -6);
  const trendEnd = addDays(startOfDay(now), 1);

  const [
    productSupplyTotal,
    productSupplyAverage,
    storeCount,
    financeTotal,
    recentOrders,
    products,
    recentSyncLogs,
    failedSyncCount,
    pendingSupplyCount,
    failedSupplyCount,
    activeStoreCount,
  ] = await Promise.all([
    prisma.productSupply.count(),
    prisma.productSupply.aggregate({ _avg: { price: true } }),
    prisma.ozonStore.count(),
    prisma.financeAccrual.aggregate({
      _sum: { accrualsForSale: true },
    }),
    prisma.ozonOrder.findMany({
      where: {
        OR: [
          { orderCreatedAt: { gte: trendStart, lt: trendEnd } },
          { orderCreatedAt: null, inProcessAt: { gte: trendStart, lt: trendEnd } },
        ],
      },
      select: { orderCreatedAt: true, inProcessAt: true, totalPrice: true },
    }),
    prisma.product.findMany({
      select: {
        isAutoArchived: true,
        isArchived: true,
        hasErrors: true,
        hasWarnings: true,
        statusName: true,
        totalStock: true,
        ozonSku: true,
      },
    }),
    prisma.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        user: { select: { username: true, nickname: true } },
      },
    }),
    prisma.syncLog.count({ where: { status: 'failed' } }),
    prisma.productSupply.count({ where: { status: 'pending' } }),
    prisma.productSupply.count({ where: { status: 'failed' } }),
    prisma.ozonStore.count({ where: { status: 'active' } }),
  ]);

  const recentSyncStoreIds = Array.from(new Set(
    recentSyncLogs
      .map(log => log.ozonStoreId)
      .filter((id): id is number => Number.isInteger(id) && id > 0),
  ));
  const recentSyncStores = recentSyncStoreIds.length > 0
    ? await prisma.ozonStore.findMany({
        where: { id: { in: recentSyncStoreIds } },
        select: { id: true, name: true },
      })
    : [];
  const storeNameById = new Map(recentSyncStores.map(store => [store.id, store.name]));

  const productStatus = summarizeProductStatuses(products);
  const actionItems: DashboardSummary['actionItems'] = [
    {
      key: 'product-errors',
      label: '异常商品',
      value: productStatus.error,
      description: 'Ozon 商品缺少 SKU、存在错误或处于不出售状态',
      level: productStatus.error > 0 ? 'danger' : 'info',
    },
    {
      key: 'pending-supply',
      label: '待上架商品',
      value: pendingSupplyCount,
      description: '商品库中等待提交到 Ozon 的商品',
      level: pendingSupplyCount > 0 ? 'warning' : 'info',
    },
    {
      key: 'failed-supply',
      label: '上架失败',
      value: failedSupplyCount,
      description: '最近提交 Ozon 后返回失败的商品',
      level: failedSupplyCount > 0 ? 'danger' : 'info',
    },
    {
      key: 'sync-failed',
      label: '失败同步',
      value: failedSyncCount,
      description: '同步日志中状态为 failed 的记录',
      level: failedSyncCount > 0 ? 'danger' : 'info',
    },
    {
      key: 'inactive-store',
      label: '未启用店铺',
      value: Math.max(storeCount - activeStoreCount, 0),
      description: '已添加但当前不是 active 状态的 Ozon 店铺',
      level: storeCount - activeStoreCount > 0 ? 'warning' : 'info',
    },
  ];

  return {
    stats: {
      productSupplyTotal,
      averageProductPrice: Number((productSupplyAverage._avg.price || 0).toFixed(2)),
      storeCount,
      totalSalesAmount: Number((financeTotal._sum.accrualsForSale || 0).toFixed(2)),
      currency: '₽',
    },
    orderTrend: buildLastSevenDaysOrderTrend(now, recentOrders),
    productStatus,
    recentSyncLogs: recentSyncLogs.map(log => ({
      id: log.id,
      syncType: log.syncType,
      status: log.status,
      message: log.message || '',
      storeName: storeNameById.get(log.ozonStoreId) || '全局任务',
      operatorName: log.user?.nickname || log.user?.username || '系统',
      createdAt: log.createdAt.toISOString(),
    })),
    actionItems,
    updatedAt: now.toISOString(),
  };
}
