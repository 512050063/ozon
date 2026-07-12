import { Router } from 'express';
import {
  createTask,
  createWorker,
  deleteWorker,
  getTask,
  listWorkers,
} from '../controllers/ozonBrowserTaskController';

const router = Router();

router.post('/workers', createWorker);
router.get('/workers', listWorkers);
router.delete('/workers/:id', deleteWorker);
router.post('/tasks', createTask);
router.get('/tasks/:id', getTask);

export default router;
