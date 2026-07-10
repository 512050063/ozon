import express from 'express';
import { resolveProductNameTranslationsController } from '../controllers/translationController';

const router = express.Router();

router.post('/product-names/resolve', resolveProductNameTranslationsController);

export default router;
