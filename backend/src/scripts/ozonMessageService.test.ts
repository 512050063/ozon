import assert from 'node:assert/strict';
import {
  filterConversationsByChannel,
  normalizeConversationForTest,
  normalizeMessageForTest,
  summarizeConversationFromMessagesForTest,
} from '../services/ozonMessageService';

const supportConversation = normalizeConversationForTest({
  first_unread_message_id: 0,
  unread_count: 0,
  chat: {
    chat_id: 'support-1',
    chat_type: 'SELLER_SUPPORT',
    created_at: '2026-06-26T07:45:30.813407Z',
  },
});

const notificationConversation = normalizeConversationForTest({
  unread_count: 14,
  chat: {
    chat_id: 'notice-1',
    chat_type: 'UNSPECIFIED',
    created_at: '2026-04-23T03:17:04.819819Z',
  },
});

const messages = [
  normalizeMessageForTest({
    message_id: 3,
    user: { id: 'o3_notification_user_sc', type: 'NotificationUser' },
    created_at: '2026-06-26T03:42:26.212483Z',
    data: ['最后一条内容'],
  }),
  normalizeMessageForTest({
    message_id: 1,
    user: { id: 'buyer-1', type: 'Customer' },
    created_at: '2026-06-25T11:03:24.637742Z',
    data: ['第一条内容'],
  }),
  normalizeMessageForTest({
    message_id: 2,
    user: { id: 'seller-1', type: 'Seller' },
    created_at: '2026-06-25T12:03:24.637742Z',
    data: [''],
  }),
];

assert.equal(messages[0].text, '最后一条内容');
assert.equal(messages[0].sender, 'NotificationUser');
assert.equal(messages[1].sender, 'Customer');

const summary = summarizeConversationFromMessagesForTest(notificationConversation, messages);
assert.equal(summary.buyerName, '系统通知');
assert.equal(summary.lastMessage, '最后一条内容');
assert.equal(summary.updatedAt, '2026-06-26T03:42:26.212483Z');

const sortedIds = summary.messages.map(message => message.messageId);
assert.deepEqual(sortedIds, ['1', '2', '3']);

assert.deepEqual(
  filterConversationsByChannel([supportConversation, notificationConversation], 'support').map(item => item.conversationId),
  ['support-1'],
);
assert.deepEqual(
  filterConversationsByChannel([supportConversation, notificationConversation], 'buyer').map(item => item.conversationId),
  [],
);

console.log('ozon message service assertions passed');
