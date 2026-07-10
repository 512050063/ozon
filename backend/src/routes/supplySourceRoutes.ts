import express from 'express';
import {
  createSupplySourceItem,
  deleteSupplySourceItem,
  getSupplySourceItems,
  importSupplySourceUrl,
  previewSupplySourceUrl,
  updateSupplySourceItem,
} from '../controllers/supplySourceController';

const router = express.Router();

router.get('/', getSupplySourceItems);
router.post('/', createSupplySourceItem);
router.post('/preview-url', previewSupplySourceUrl);
router.post('/from-url', importSupplySourceUrl);
router.put('/:id', updateSupplySourceItem);
router.delete('/:id', deleteSupplySourceItem);

export default router;
