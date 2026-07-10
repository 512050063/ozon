import { Router } from 'express';
import { getDashboardSummaryHandler } from '../controllers/dashboardController';

const router = Router();

router.get('/summary', getDashboardSummaryHandler);

export default router;
