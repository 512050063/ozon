import assert from 'node:assert/strict';
import {
  isNoticeChannel,
  mapMockNoticeConversations,
  mapMockNoticeMessages,
  sumUnreadCount,
} from '../src/views/customer-service/message-center/messageCenterDataSource.js';

const channelConfig = {
  buyer: { type: 'chat', label: '买家' },
  main: { type: 'notice', label: '主要' },
};

const mockNoticeConversations = [
  {
    conversationId: 'main-1',
    buyerName: '通知二',
    lastMessage: '系统通知',
    updatedAt: '2026-06-25T10:00:00.000Z',
    unreadCount: 2,
    raw: { title: '通知二' },
  },
  {
    conversationId: 'main-2',
    buyerName: '通知三',
    lastMessage: '平台公告',
    updatedAt: '2026-06-24T08:00:00.000Z',
    unreadCount: 1,
    raw: { title: '通知三' },
  },
];

const mockNoticeGroups = [
  [
    {
      id: 'n1',
      sender: '系统通知',
      title: '通知一',
      content: '内容一',
      createdAt: '2026-06-25T09:00:00.000Z',
      unreadCount: 2,
    },
    {
      id: 'n2',
      sender: '系统通知',
      title: '通知二',
      content: '内容二',
      createdAt: '2026-06-25T10:00:00.000Z',
    },
  ],
  [
    {
      id: 'n3',
      sender: '平台公告',
      title: '通知三',
      content: '内容三',
      createdAt: '2026-06-24T08:00:00.000Z',
      unreadCount: 1,
    },
  ],
];

assert.equal(isNoticeChannel(channelConfig, 'buyer'), false);
assert.equal(isNoticeChannel(channelConfig, 'main'), true);

const conversations = mapMockNoticeConversations('main', mockNoticeConversations);
assert.equal(conversations.length, 2);
assert.deepEqual(conversations[0], {
  conversationId: 'main-1',
  buyerName: '通知二',
  lastMessage: '系统通知',
  updatedAt: '2026-06-25T10:00:00.000Z',
  unreadCount: 2,
  raw: { title: '通知二' },
});
assert.equal(sumUnreadCount(conversations), 3);

const messages = mapMockNoticeMessages(mockNoticeGroups[0]);
assert.equal(messages.length, 2);
assert.deepEqual(messages[0], {
  id: 'n1',
  role: 'buyer',
  buyerName: '系统通知',
  text: '内容一',
  title: '通知一',
  content: '内容一',
  createdAt: '2026-06-25T09:00:00.000Z',
  raw: mockNoticeGroups[0][0],
});

console.log('messageCenterDataSource.test passed');
