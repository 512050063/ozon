import { Router } from 'express';
import {
  cancelPosting,
  getCancelReasons,
  getOrders,
  getOrderDetail,
  getOrderSyncLogs,
  preparePosting,
  syncOrders,
} from '../controllers/ozonOrderController';

const router = Router();

router.post('/:storeId/sync', syncOrders);
router.get('/:storeId/sync-logs', getOrderSyncLogs);
router.get('/:storeId/:postingNumber/cancel-reasons', getCancelReasons);
router.post('/:storeId/:postingNumber/prepare', preparePosting);
router.post('/:storeId/:postingNumber/cancel', cancelPosting);
router.get('/:storeId', getOrders);
router.get('/:storeId/:postingNumber', getOrderDetail);

export default router;
