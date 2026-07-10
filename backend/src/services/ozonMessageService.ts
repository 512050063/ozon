import prisma from '../config/database';
import logger from '../config/logger';

const OZON_API_BASE_URL = 'https://api-seller.ozon.ru';
const CHAT_LIST_ENDPOINT = '/v3/chat/list';
const CHAT_HISTORY_ENDPOINT = '/v3/chat/history';
const CHAT_SEND_ENDPOINT = '/v3/chat/send/message';

// 请求超时配置（秒）
const REQUEST_TIMEOUT_S = 15;
const MAX_RETRIES = 2;

interface ConversationListParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  channel?: string;
}

interface ConversationMessagesParams {
  limit?: number;
}

type NormalizedConversation = {
  conversationId: string;
  buyerName: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  raw: any;
};

type NormalizedMessage = {
  messageId: string;
  sender: string;
  text: string;
  createdAt: string;
  raw: any;
};

// ============ 请求工具函数 ============

/**
 * 带超时控制的 fetch 请求
 * Node.js 22 的 undici 默认 connect timeout 较短，不稳定网络下容易 ConnectTimeoutError
 * 使用 AbortController 显式设置 15 秒超时
 */
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Ozon API 请求（带重试）
 * 网络抖动场景下自动重试最多 2 次
 */
const ozonApiRequest = async (
  endpoint: string,
  clientId: string,
  apiKey: string,
  data: any,
): Promise<any> => {
  const url = `${OZON_API_BASE_URL}${endpoint}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        // 指数退避：1s, 2s
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.info(`[OzonChat] 第 ${attempt + 1} 次重试，等待 ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Client-Id': clientId,
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        },
        REQUEST_TIMEOUT_S * 1000,
      );

      const text = await response.text();
      const parsedData = text ? JSON.parse(text) : {};

      if (!response.ok) {
        const message = parsedData?.message || parsedData?.error || `Ozon API 返回错误: ${response.status}`;
        throw new Error(message);
      }

      return parsedData;
    } catch (error: any) {
      lastError = error;

      // 判断是否为网络层错误（可重试），API 业务错误不重试
      const isNetworkError =
        error.name === 'AbortError' ||
        error.name === 'TimeoutError' ||
        error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        error.cause?.code === 'ECONNREFUSED' ||
        error.cause?.code === 'ENOTFOUND' ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('Connect Timeout');

      if (!isNetworkError || attempt === MAX_RETRIES) {
        break;
      }
    }
  }

  const errorMsg =
    lastError?.name === 'AbortError'
      ? 'Ozon API 请求超时（15秒），请检查网络连接'
      : lastError?.message || 'Ozon API 请求失败';

  logger.error('[OzonChat] 请求最终失败:', { endpoint, error: lastError?.message });
  throw new Error(errorMsg);
};

// ============ 数据库查询 ============

const getStoreCredentials = async (storeId: number) => {
  const store = await prisma.ozonStore.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      clientId: true,
      apiKey: true,
      status: true,
    },
  });

  if (!store) {
    throw new Error('Ozon店铺不存在');
  }

  if (!store.clientId || !store.apiKey) {
    throw new Error('Ozon店铺API凭证不完整');
  }

  return store;
};

// ============ 数据规范化 ============

/**
 * Ozon Chat List API 返回的每条记录结构：
 * {
 *   chat: { chat_id, chat_status, chat_type, created_at },
 *   first_unread_message_id, last_message_id, unread_count
 * }
 * buyerName/lastMessage 由后续 getConversationMessages 获取详情填充，列表接口不返回
 */
const getChatType = (conversation: NormalizedConversation | any): string => {
  const raw = conversation.raw || conversation;
  return String(raw.chat?.chat_type || raw.chat_type || conversation.chatType || '').toUpperCase();
};

const getMessageText = (message: any): string => {
  const direct = message.text || message.message || message.content || message.body || '';
  if (direct) {
    return String(direct);
  }

  if (Array.isArray(message.data)) {
    return message.data
      .filter((item: unknown) => item !== null && item !== undefined)
      .map((item: unknown) => typeof item === 'string' ? item : JSON.stringify(item))
      .join('\n')
      .trim();
  }

  if (message.data && typeof message.data === 'object') {
    return String(message.data.text || message.data.message || message.data.content || '').trim();
  }

  return '';
};

const getSender = (message: any): string => String(
  message.sender ||
  message.author ||
  message.user_type ||
  message.type ||
  message.user?.type ||
  message.user?.id ||
  '',
);

const normalizeConversation = (conversation: any): NormalizedConversation => {
  const chat = conversation.chat || {};
  const conversationId = String(
    chat.chat_id ||
    conversation.chat_id ||
    conversation.conversation_id ||
    conversation.id ||
    conversation.chatId ||
    '',
  );

  const chatType = String(chat.chat_type || conversation.chat_type || '');
  const fallbackName = chatType === 'SELLER_SUPPORT'
    ? 'Ozon客服'
    : chatType && chatType !== 'UNSPECIFIED'
      ? chatType
      : '买家消息';

  return {
    conversationId,
    buyerName: conversation.buyer_name || conversation.customer_name || conversation.name || conversation.user_name || fallbackName,
    lastMessage: conversation.last_message || conversation.lastMessage || '',
    updatedAt: conversation.updated_at || conversation.update_time || chat.created_at || conversation.created_at || '',
    unreadCount: Number(conversation.unread_count || conversation.unreadCount || 0),
    raw: conversation,
  };
};

const normalizeMessage = (message: any): NormalizedMessage => ({
  messageId: String(message.message_id || message.id || message.uuid || `${message.created_at || ''}-${getMessageText(message)}`),
  sender: getSender(message),
  text: getMessageText(message),
  createdAt: message.created_at || message.createdAt || message.date || '',
  raw: message,
});

const messageTime = (message: Pick<NormalizedMessage, 'createdAt'>): number => {
  const time = new Date(message.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortMessagesAsc = (messages: NormalizedMessage[]) => (
  [...messages].sort((a, b) => messageTime(a) - messageTime(b))
);

const summarizeConversationFromMessages = (
  conversation: NormalizedConversation,
  messages: NormalizedMessage[],
): NormalizedConversation & { messages: NormalizedMessage[] } => {
  const sortedMessages = sortMessagesAsc(messages);
  const lastMessage = [...sortedMessages].reverse().find(message => message.text.trim());
  const chatType = getChatType(conversation);
  const latestMessage = sortedMessages[sortedMessages.length - 1];

  let buyerName = conversation.buyerName;
  if (!buyerName || buyerName === '买家消息' || buyerName === 'UNSPECIFIED' || buyerName === 'SELLER_SUPPORT') {
    buyerName = chatType === 'SELLER_SUPPORT'
      ? 'Ozon客服'
      : chatType === 'UNSPECIFIED'
        ? '系统通知'
        : '买家消息';
  }

  return {
    ...conversation,
    buyerName,
    lastMessage: lastMessage?.text || conversation.lastMessage || '暂无内容',
    updatedAt: lastMessage?.createdAt || latestMessage?.createdAt || conversation.updatedAt,
    messages: sortedMessages,
  };
};

export const filterConversationsByChannel = (
  conversations: NormalizedConversation[],
  channel?: string,
): NormalizedConversation[] => {
  if (!channel) {
    return conversations;
  }

  if (channel === 'support') {
    return conversations.filter(conversation => getChatType(conversation) === 'SELLER_SUPPORT');
  }

  if (channel === 'buyer') {
    return conversations.filter((conversation) => {
      const chatType = getChatType(conversation);
      return chatType !== 'SELLER_SUPPORT' && chatType !== 'UNSPECIFIED';
    });
  }

  return conversations;
};

export const normalizeConversationForTest = normalizeConversation;
export const normalizeMessageForTest = normalizeMessage;
export const summarizeConversationFromMessagesForTest = summarizeConversationFromMessages;

// ============ 导出方法 ============

export const getConversations = async (storeId: number, params: ConversationListParams) => {
  const store = await getStoreCredentials(storeId);
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  const data: any = {
    limit,
    offset,
  };

  if (params.unreadOnly) {
    data.unread_only = true;
  }
  if (params.channel) {
    data.channel = params.channel;
  }

  const response = await ozonApiRequest(CHAT_LIST_ENDPOINT, store.clientId, store.apiKey, data);
  const items = response.result?.chats || response.result?.items || response.chats || response.items || [];
  const normalized = items.map(normalizeConversation).filter((item: any) => item.conversationId);
  const filtered = filterConversationsByChannel(normalized, params.channel);
  const hydrated = await Promise.all(
    filtered.map(async (conversation) => {
      try {
        const detail = await getConversationMessages(storeId, conversation.conversationId, { limit: 20 });
        return summarizeConversationFromMessages(conversation, detail.messages);
      } catch (error: any) {
        logger.warn('[OzonChat] 补齐会话摘要失败:', {
          conversationId: conversation.conversationId,
          error: error?.message,
        });
        return conversation;
      }
    }),
  );
  hydrated.sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });

  return {
    conversations: hydrated,
    total: hydrated.length,
  };
};

export const getConversationMessages = async (
  storeId: number,
  conversationId: string,
  params: ConversationMessagesParams,
) => {
  const store = await getStoreCredentials(storeId);
  const response = await ozonApiRequest(CHAT_HISTORY_ENDPOINT, store.clientId, store.apiKey, {
    chat_id: conversationId,
    limit: params.limit || 100,
  });
  const items = response.result?.messages || response.result?.items || response.messages || response.items || [];

  return {
    conversationId,
    messages: sortMessagesAsc(items.map(normalizeMessage)),
  };
};

export const sendReply = async (storeId: number, conversationId: string, text: string) => {
  const store = await getStoreCredentials(storeId);

  await ozonApiRequest(CHAT_SEND_ENDPOINT, store.clientId, store.apiKey, {
    chat_id: conversationId,
    text,
  });
};
