export function isNoticeChannel(channelConfig, channel) {
  return channelConfig[channel]?.type === 'notice';
}

export function mapMockNoticeConversations(channel, groups = []) {
  return groups.map((conversation) => ({
    conversationId: conversation.conversationId,
    buyerName: conversation.buyerName,
    lastMessage: conversation.lastMessage,
    updatedAt: conversation.updatedAt,
    unreadCount: conversation.unreadCount || 0,
    raw: conversation.raw || null,
  }));
}

export function mapMockNoticeMessages(items) {
  return items.map((notice) => ({
    id: notice.id,
    role: 'buyer',
    buyerName: notice.sender || '系统通知',
    text: notice.content || '',
    title: notice.title || '通知',
    content: notice.content || '',
    createdAt: notice.createdAt || new Date().toISOString(),
    raw: notice,
  }));
}

export function sumUnreadCount(items) {
  return items.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);
}
