import express from 'express';
import { receiveOzonPush } from '../controllers/ozonPushController';

const router = express.Router();

router.post('/receive/:storeId/:secret', receiveOzonPush);

export default router;
