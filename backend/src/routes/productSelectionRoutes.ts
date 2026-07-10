import express from 'express';
import {
  createProductSelection,
  getProductSelections,
  getProductSelectionById,
  updateProductSelection,
  deleteProductSelection
} from '../controllers/productSelectionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/products/selection', authenticateToken, createProductSelection);
router.get('/products/selection', authenticateToken, getProductSelections);
router.get('/products/selection/:id', authenticateToken, getProductSelectionById);
router.put('/products/selection/:id', authenticateToken, updateProductSelection);
router.delete('/products/selection/:id', authenticateToken, deleteProductSelection);

export default router;
