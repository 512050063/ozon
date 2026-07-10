import { Router } from 'express';
import { getProductByUrl, searchProducts } from '../controllers/ozonSearchController';

const router = Router();

router.get('/search', searchProducts);
router.post('/product-by-url', getProductByUrl);

export default router;
