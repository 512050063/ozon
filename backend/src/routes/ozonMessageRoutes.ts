import { Router } from 'express';
import {
  getConversations,
  getConversationMessages,
  sendReply,
} from '../controllers/ozonMessageController';

const router = Router();

router.get('/:storeId/conversations', getConversations);
router.get('/:storeId/conversations/:conversationId', getConversationMessages);
router.post('/:storeId/conversations/:conversationId/reply', sendReply);

export default router;
