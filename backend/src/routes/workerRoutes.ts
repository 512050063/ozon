import { Router } from 'express';
import {
  workerClaimTask,
  workerCompleteTask,
  workerFailTask,
  workerHeartbeat,
  workerProgressTask,
  workerStartTask,
} from '../controllers/ozonBrowserTaskController';

const router = Router();

router.post('/heartbeat', workerHeartbeat);
router.post('/tasks/claim', workerClaimTask);
router.post('/tasks/:id/start', workerStartTask);
router.post('/tasks/:id/progress', workerProgressTask);
router.post('/tasks/:id/complete', workerCompleteTask);
router.post('/tasks/:id/fail', workerFailTask);

export default router;
