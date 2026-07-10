import { Router } from 'express';
import {
  getFinanceTotalsHandler,
  getFinancePostingsHandler,
  syncFinanceHandler,
  getSyncStatusHandler,
  getFinanceSyncLogsHandler,
} from '../controllers/ozonFinanceController';

const router = Router();

// 统计汇总
router.get('/:storeId/totals', getFinanceTotalsHandler);

// 列表明细
router.get('/:storeId/postings', getFinancePostingsHandler);

// 同步数据到本地DB
router.post('/:storeId/sync', syncFinanceHandler);

// 同步状态
router.get('/:storeId/sync-status', getSyncStatusHandler);

// 同步日志
router.get('/:storeId/sync-logs', getFinanceSyncLogsHandler);

export default router;
