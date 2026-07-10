import { Request, Response } from 'express';
import * as service from '../services/ozonFinanceService';
import logger from '../config/logger';

/** GET /:storeId/totals — 财务统计汇总（纯本地DB聚合，秒级响应） */
export async function getFinanceTotalsHandler(req: Request, res: Response) {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const { date_from, date_to } = req.query as Record<string, string>;

    if (!date_from || !date_to) {
      return res.status(400).json({ success: false, message: '缺少 date_from / date_to 参数' });
    }

    // 全部从本地DB聚合（不调Ozon API，秒级响应）
    const [sync, localTotals, categories] = await Promise.all([
      service.getSyncMeta(storeId),
      service.computeTotalsFromLocal(storeId, date_from, date_to),
      service.aggregateByType(storeId, date_from, date_to),
    ]);

    const totals = await service.enrichTotalsWithOpeningDebt(storeId, date_from, date_to, localTotals);
    const expenseRows = service.buildFinanceExpenseRows(totals);

    return res.json({ success: true, data: { totals, categories, expenseRows, sync } });
  } catch (err: any) {
    logger.error('[FinanceController] totals error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /:storeId/postings — 列表明细（按 posting 分组，优先本地DB） */
export async function getFinancePostingsHandler(req: Request, res: Response) {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const { date_from, date_to, type, posting_number, page, page_size } = req.query as Record<string, string>;

    if (!date_from || !date_to) {
      return res.status(400).json({ success: false, message: '缺少 date_from / date_to 参数' });
    }

    const pg = page ? parseInt(page, 10) : 1;
    const ps = page_size ? parseInt(page_size, 10) : 50;

    // 优先从本地 DB 查询（分组返回，对齐 Ozon 结构）
    const localResult = await service.getGroupedPostings(storeId, {
      dateFrom: date_from,
      dateTo: date_to,
      type: type || undefined,
      postingNumber: posting_number || undefined,
      page: pg,
      pageSize: ps,
    });

    if (localResult.total > 0) {
      return res.json({
        success: true,
        data: {
          items: localResult.items,
          total: localResult.total,
          totalOperations: localResult.totalOperations,
          page: localResult.page,
          pageSize: localResult.pageSize,
          source: 'db',
        },
      });
    }

    // 本地无数据，从 API 实时获取（仍用平面列表，前端兼容处理）
    const apiResult = await service.getAllPostings(storeId, date_from, date_to);
    const apiOps = apiResult.operations.map((op: any) => ({
      _groupKey: '',
      isGroup: false,
      operation: {
        ...op,
        operation_type_name_zh: service.translateOpType(op.operation_type_name),
        delivery_schema_zh: service.translateDeliverySchema(op.delivery_schema || op.posting?.delivery_schema),
      },
    }));
    const start = (pg - 1) * ps;

    return res.json({
      success: true,
      data: {
        items: apiOps.slice(start, start + ps),
        total: apiOps.length,
        totalOperations: apiOps.length,
        page: pg,
        pageSize: ps,
        source: 'api',
      },
    });
  } catch (err: any) {
    logger.error('[FinanceController] postings error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /:storeId/sync — 全量/增量同步到数据库 */
export async function syncFinanceHandler(req: Request, res: Response) {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const { date_from, date_to } = req.body || {};
    const userId = (req as any).user?.id;

    if (!date_from || !date_to) {
      return res.status(400).json({ success: false, message: '缺少 date_from / date_to 参数' });
    }

    // 先查是否有数据，决定全量还是增量
    const meta = await service.getSyncMeta(storeId);
    const mode = meta.totalRecords > 0 ? 'incremental' : 'full';

    // 立即返回（后台异步执行）
    res.json({ success: true, data: { message: `${mode === 'full' ? '全量' : '增量'}同步已启动，后台执行中...`, mode } });

    service.syncAllToDatabase(storeId, date_from, date_to, userId)
      .then(r => logger.info(`[Finance Sync] ${r.mode} 完成: ${r.stored} 条 (活跃 ${r.probed} 月, 跳过 ${r.skipped} 月)`))
      .catch(async (e) => {
        logger.error('[Finance Sync] 失败:', e.message);
        await service.recordFinanceSyncFailure(storeId, userId, e.message);
      });

  } catch (err: any) {
    logger.error('[FinanceController] sync error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /:storeId/sync-status — 查询同步状态 */
export async function getSyncStatusHandler(req: Request, res: Response) {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const meta = await service.getSyncMeta(storeId);
    return res.json({ success: true, data: meta });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getFinanceSyncLogsHandler(req: Request, res: Response) {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10;
    const data = await service.getFinanceSyncLogs(storeId, page, pageSize);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
