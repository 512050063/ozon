import { Router } from 'express';
import {
  activatePromotionProduct,
  deactivatePromotionProduct,
  getPromotionCandidates,
  getPromotionProducts,
  getPromotionSyncLogs,
  getPromotions,
} from '../controllers/ozonPromotionController';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken, requirePermission('ozon/promotions'));

router.get('/:storeId/sync-logs', getPromotionSyncLogs);
router.get('/:storeId', getPromotions);
router.get('/:storeId/:actionId/products', getPromotionProducts);
router.get('/:storeId/:actionId/candidates', getPromotionCandidates);
router.post('/:storeId/:actionId/products', activatePromotionProduct);
router.delete('/:storeId/:actionId/products/:productId', deactivatePromotionProduct);

export default router;
