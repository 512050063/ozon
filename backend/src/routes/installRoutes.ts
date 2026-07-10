import express from 'express';
import {
  configureDatabase,
  createAdmin,
  finalizeInstall,
  getInstallStatus,
  importBaselineData,
  runInstallCheck,
} from '../controllers/installController';

const router = express.Router();

router.get('/status', getInstallStatus);
router.post('/check', runInstallCheck);
router.post('/database', configureDatabase);
router.post('/baseline-data', importBaselineData);
router.post('/admin', createAdmin);
router.post('/finalize', finalizeInstall);

export default router;
