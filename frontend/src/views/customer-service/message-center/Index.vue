<template>
  <MainLayout>
    <div class="app-page app-page-stack app-page--fixed message-center-page">
      <!-- Tab区域 -->
      <div class="bg-white rounded-xl border border-slate-200 px-5 overflow-hidden h-[100px] flex items-center shadow-sm flex-shrink-0">
        <div class="flex items-center gap-6 overflow-x-auto h-full pl-4 flex-1">
          <button
            v-for="tab in messageTabs"
            :key="tab.value"
            @click="handleMessageTabChange(tab.value)"
            :class="[
              'px-4 h-full cursor-pointer text-sm transition-all duration-200 relative flex items-center border-b-2 border-transparent whitespace-nowrap',
              messageTab === tab.value ? 'text-blue-600 font-semibold' : 'text-slate-500 font-medium hover:text-slate-900'
            ]"
          >
            <span
              v-if="messageTab === tab.value"
              class="absolute bottom-0 left-0 right-0 h-1 rounded-t-full bg-blue-600"
            >
            </span>
            <span>{{ tab.label }}</span>
            <!-- 未读消息数 - 圆圈样式 -->
            <span
              v-if="tab.count > 0"
              class="ml-2 min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#f56c6c] text-white text-[10px] flex items-center justify-center"
            >
              {{ tab.count }}
            </span>
            <span
              v-else
              class="ml-2 min-w-[16px] h-[16px] px-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center"
            >
              {{ tab.count }}
            </span>
          </button>
        </div>
      </div>
      <div class="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        <!-- 左侧：消息列表 -->
        <div
          class="col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div
            class="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
            <div class="text-left">
              <div class="text-lg font-bold text-slate-900">消息列表</div>
            </div>
            <div class="text-xs text-slate-500">
              共 {{ conversations.length }} 条
            </div>
          </div>
          <div v-if="conversationsLoading" class="flex-1 flex items-center justify-center text-sm text-slate-500">
            正在加载消息...
          </div>
          <AppEmpty v-else-if="!selectedStoreId" title="未设置当前店铺" description="请先在顶部选择当前操作店铺" />
          <AppEmpty v-else-if="conversations.length === 0" :title="emptyTitle" :description="emptyDescription" />
          <div v-else class="flex-1 overflow-y-auto p-3 space-y-2">
            <button v-for="conversation in conversations" :key="conversation.conversationId"
              class="w-full p-3 text-left rounded-xl border transition-all duration-200"
              :class="selectedConversation && selectedConversation.conversationId === conversation.conversationId ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'"
              @click="selectConversation(conversation)">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-semibold">
                  {{ getAvatarText(conversation) }}
                </div>
                <div class="min-w-0 flex-1">
                  <!-- 第一行：名称/发送方 + 时间 -->
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-sm font-semibold text-slate-900 truncate">
                      {{ getConversationTitle(conversation) }}
                    </div>
                    <span class="text-[11px] text-slate-400 flex-shrink-0">{{ formatConversationTime(conversation.updatedAt) }}</span>
                  </div>
                  <!-- 第二行：内容/标题 + 未读消息数 -->
                  <div class="flex items-center justify-between gap-2 mt-1">
                    <div class="text-xs text-slate-500 truncate flex-1 whitespace-nowrap overflow-hidden">
                      {{ getConversationSubtitle(conversation) }}
                    </div>
                    <el-badge v-if="conversation.unreadCount > 0" :value="conversation.unreadCount" class="flex-shrink-0" />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- 右侧：消息内容 -->
        <div
          class="col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
          <!-- 情况1：当前频道无任何消息 -->
          <div v-if="conversations.length === 0" class="flex-1 flex flex-col items-center justify-center p-5">
            <AppEmpty :title="emptyTitle" :description="emptyDescription" />
          </div>

          <!-- 情况2：有消息但未选择 -->
          <div v-else-if="!selectedConversation" class="flex-1 flex flex-col items-center justify-center p-5">
            <AppEmpty title="请选择消息" :description="currentChannelType === 'chat' ? '请选择聊天以开始对话' : '请选择消息以查看详情'" />
          </div>

          <!-- 情况3：已选择消息 -->
          <template v-else>
            <!-- 标题栏 - 显示名称/发送方，左对齐 -->
            <div class="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 flex items-center">
              <div class="text-lg font-bold text-slate-900">
                {{ currentChannelType === 'chat' ? selectedConversation.buyerName : selectedConversation.lastMessage }}
              </div>
            </div>

            <!-- 内容区 -->
            <div ref="messagesContainerRef" class="flex-1 min-h-0 p-5 overflow-y-auto bg-slate-50/80 scrollbar-hide">
              <div v-if="messagesLoading" class="h-full flex items-center justify-center text-sm text-slate-500">
                正在加载消息...
              </div>

              <!-- 对话消息样式 -->
              <AppEmpty v-else-if="currentChannelType === 'chat' && messages.length === 0" title="暂无聊天记录" description="当前会话暂无聊天内容" />
              <div v-else-if="currentChannelType === 'chat'" class="space-y-4">
                <template v-for="(group, groupIndex) in groupedMessages" :key="groupIndex">
                  <!-- 日期分隔线 -->
                  <div class="flex justify-center items-center my-4">
                    <div class="bg-slate-200 text-slate-500 text-xs px-3 py-1 rounded-full">
                      {{ group.dateLabel }}
                    </div>
                  </div>
                  <!-- 该日期下的消息 -->
                  <div v-for="message in group.messages" :key="message.id" class="flex items-start gap-2"
                    :class="message.role === 'seller' ? 'justify-end' : 'justify-start'">
                    <div v-if="message.role === 'buyer'"
                      class="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      {{ (message.buyerName || '?').slice(0, 1) }}
                    </div>
                    <div class="max-w-[68%]">
                      <!-- 时间在上方边角 -->
                      <div :class="['text-[10px] mb-1', message.role === 'seller' ? 'text-right text-blue-300' : 'text-left text-slate-400']">
                        {{ formatTime(message.createdAt) }}
                      </div>
                      <!-- 消息气泡 -->
                      <div class="rounded-2xl px-4 py-3 shadow-sm text-left"
                        :class="message.role === 'seller' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'">
                        <div class="text-xs leading-5 whitespace-pre-wrap">{{ message.text }}</div>
                      </div>
                    </div>
                    <div v-if="message.role === 'seller'"
                      class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      我
                    </div>
                  </div>
                </template>
              </div>

              <!-- 新闻消息样式 -->
              <div v-else class="space-y-4">
                <div v-for="notice in messages" :key="notice.id" class="space-y-2">
                  <div class="text-center">
                    <span class="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      {{ formatDateLabel(notice.createdAt) }}
                    </span>
                  </div>
                  <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div class="text-base font-semibold text-slate-900 mb-3 text-left">
                      {{ notice.title }}
                    </div>
                    <div class="text-xs text-slate-700 leading-6 whitespace-pre-wrap text-left">
                      {{ notice.content }}
                    </div>
                    <div class="text-right mt-3">
                      <span class="text-xs text-slate-400">{{ formatConversationTime(notice.createdAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 输入框 - 仅对话消息显示 -->
            <div v-if="currentChannelType === 'chat'" class="p-3 border-t border-slate-200 bg-white">
              <div class="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <el-input v-model="replyText" type="textarea" :rows="2" placeholder="请输入回复内容"
                  :disabled="sendingReply" class="reply-input" @keyup.enter="sendReply" />
                <div class="h-9 px-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/60">
                  <!-- 左侧功能图标 -->
                  <div class="flex items-center gap-1">
                    <!-- 表情图标 - 用户提供的第一个SVG -->
                    <button class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer">
                      <svg t="1781506946980" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="18" height="18"><path d="M942.577061 507.011382c0-237.637282-192.632275-430.269557-430.269557-430.269557s-430.269557 192.632275-430.269557 430.269557c0 237.647515 192.632275 430.27979 430.269557 430.27979 97.553827 0 186.878225-33.189913 259.055081-87.88563 2.964518-3.363607 4.91187-7.655354 4.91187-12.479219 0-10.531867-8.541537-19.073404-19.072381-19.073404-5.465478 0-10.334369 2.168386-13.808494 5.842055l-0.242524 0c-64.584947 47.526433-144.086629 75.981509-230.422973 75.981509-215.179804 0-389.645324-174.489056-389.645324-389.656581 0-215.201294 174.466544-389.644301 389.645324-389.644301 215.202317 0 389.645324 174.443008 389.645324 389.644301 0 65.738213-15.423271 127.60219-44.186362 181.922353l0 0.321318c-0.533143 1.814322-1.108241 3.583618-1.108241 5.53097 0 10.531867 8.541537 19.073404 19.073404 19.073404 8.207939 0 15.06716-5.265934 17.745153-12.523221l0 0.13303C924.544359 645.279493 942.577061 578.258053 942.577061 507.011382zM399.574976 391.378805c0-24.028253-19.47147-43.499723-43.500746-43.499723-24.029276 0-43.478234 19.47147-43.478234 43.499723 0 24.029276 19.448958 43.479257 43.478234 43.479257C380.102483 434.858062 399.574976 415.408081 399.574976 391.378805zM669.735999 347.945597c-24.004717 0-43.476187 19.448958-43.476187 43.478234 0 24.029276 19.47147 43.500746 43.476187 43.500746 24.029276 0 43.50177-19.47147 43.50177-43.500746C713.237769 367.394554 693.766298 347.945597 669.735999 347.945597zM702.196295 630.742405c0-11.793604-9.558703-21.330818-21.350261-21.330818-1.88186 0-3.562129 0.620124-5.335519 1.084705l-0.441045 0c-49.473785 22.723537-104.548124 38.610366-162.562423 38.610366-57.130162 0-111.007233-16.130376-159.907966-38.233789l-0.177032 0c-2.300392-0.818645-4.690836-1.461281-7.2798-1.461281-11.880585 0-21.505803 9.602705-21.505803 21.485337 0 8.120958 4.513804 15.222703 11.129478 18.872836 54.209646 24.6494 113.883747 42.980907 177.319521 42.980907 63.037708 0 124.240629-18.686594 178.185238-43.046399 0.308015-0.149403 0.217964-0.11154 0.070608-0.045025C696.59574 645.928269 702.196295 638.545114 702.196295 630.742405z" fill="currentColor"></path></svg>
                    </button>
                    <!-- 截图图标 - 用户提供的第二个SVG -->
                    <button class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer">
                      <svg t="1781506990257" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="18" height="18"><path d="M981.3 821.3h-96V170.7c0-17.7-14.3-32-32-32H202.7v-96c0-17.7-14.3-32-32-32s-32 14.3-32 32v96h-96c-17.7 0-32 14.3-32 32s14.3 32 32 32h96v650.7c0 17.7 14.3 32 32 32h650.7v96c0 17.7 14.3 32 32 32s32-14.3 32-32v-96h96c17.7 0 32-14.3 32-32-0.1-17.7-14.4-32.1-32.1-32.1z m-778.6 0V202.7h618.7v618.7H202.7z" fill="currentColor"></path></svg>
                    </button>
                    <!-- Microphone图标 - Element Plus -->
                    <button class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer">
                      <component :is="Microphone" style="width: 18px; height: 18px;" />
                    </button>
                    <!-- Box图标 - Element Plus -->
                    <button class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer">
                      <component :is="Box" style="width: 18px; height: 18px;" />
                    </button>
                    <!-- Picture图标 - Element Plus -->
                    <button class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer">
                      <component :is="Picture" style="width: 18px; height: 18px;" />
                    </button>
                  </div>
                  <!-- 右侧发送按钮 -->
                  <el-button type="primary" size="small" class="px-3" :loading="sendingReply"
                    :disabled="!replyText.trim()" @click="sendReply">
                    发送
                  </el-button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Microphone, Box, Picture } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
import AppEmpty from '@/components/ui/AppEmpty.vue';
// AppInput 已移除，使用全局CSS样式
import { ozonMessageAPI, type OzonConversation, type OzonMessage } from '@/api/ozonMessageAPI';
import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
import {
  getConversationsByChannel,
  getMessagesByChannel,
} from '@/data/mockMessages';
import {
  isNoticeChannel,
  mapMockNoticeConversations,
  mapMockNoticeMessages,
  sumUnreadCount,
} from './messageCenterDataSource';

const channelConfig = {
  buyer: { type: 'chat', label: '买家' },
  support: { type: 'chat', label: '客服' },
  main: { type: 'notice', label: '主要' },
  notification: { type: 'notice', label: '通知' },
  warning: { type: 'notice', label: '警告' },
  promotion: { type: 'notice', label: '推广' },
  training: { type: 'notice', label: '培训' },
  finance: { type: 'notice', label: '金融服务' },
} as const;

type ChannelKey = keyof typeof channelConfig;
type ConversationItem = OzonConversation;
type MessageItem = {
  id: string;
  role: 'buyer' | 'seller';
  buyerName: string;
  text: string;
  title: string;
  content: string;
  createdAt: string;
  raw?: any;
};

const normalizeConversation = (conversation: OzonConversation): ConversationItem => ({
  ...conversation,
  buyerName:
    conversation.buyerName ||
    conversation.raw?.title ||
    conversation.raw?.subject ||
    conversation.raw?.name ||
    '未命名会话',
  lastMessage:
    conversation.lastMessage ||
    conversation.raw?.sender ||
    conversation.raw?.author ||
    conversation.raw?.channel ||
    '系统通知',
  updatedAt:
    conversation.updatedAt ||
    conversation.raw?.updated_at ||
    conversation.raw?.created_at ||
    new Date().toISOString(),
});

const isSellerMessage = (message: OzonMessage): boolean => {
  const raw = message.raw || {};
  const flags = [
    message.sender,
    raw.sender,
    raw.author,
    raw.user_type,
    raw.direction,
    raw.message_type,
    raw.source,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (raw.is_my_message === true || raw.is_outbound === true) {
    return true;
  }

  return ['seller', 'support', 'operator', 'merchant', 'manager', 'admin', 'me', 'outgoing', 'out'].some(
    keyword => flags.includes(keyword)
  );
};

const normalizeMessage = (message: OzonMessage, conversation: ConversationItem | null): MessageItem => {
  const raw = message.raw || {};
  const dataContent = Array.isArray(raw.data)
    ? raw.data.filter((item: unknown) => item !== null && item !== undefined).join('\n').trim()
    : '';
  const content = raw.content || raw.body || message.text || raw.message || dataContent || '';

  return {
    id: message.messageId || `${message.createdAt || raw.created_at || Date.now()}-${content}`,
    role: isSellerMessage(message) ? 'seller' : 'buyer',
    buyerName: conversation?.buyerName || raw.buyer_name || raw.customer_name || '买家',
    text: message.text || content,
    title: raw.title || raw.subject || conversation?.buyerName || '通知',
    content,
    createdAt: message.createdAt || raw.created_at || raw.date || new Date().toISOString(),
    raw,
  };
};

const selectedStoreId = ref<number>();
const { loadStoreContext, storeContext } = useOzonStoreContext();
const storeContextReady = ref(false);

const conversations = ref<ConversationItem[]>([]);
const selectedConversation = ref<ConversationItem | null>(null);
const messageTab = ref<ChannelKey>('buyer');
const messages = ref<MessageItem[]>([]);
const replyText = ref('');
const storesLoading = ref(false);
const conversationsLoading = ref(false);
const messagesLoading = ref(false);
const sendingReply = ref(false);
const messagesContainerRef = ref<HTMLElement | null>(null);

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
    }
  });
};

const messageTabs = ref([
  { label: '买家', value: 'buyer', count: 0 },
  { label: '客服', value: 'support', count: 0 },
  { label: '主要', value: 'main', count: 0 },
  { label: '通知', value: 'notification', count: 0 },
  { label: '警告', value: 'warning', count: 0 },
  { label: '推广', value: 'promotion', count: 0 },
  { label: '培训', value: 'training', count: 0 },
  { label: '金融服务', value: 'finance', count: 0 },
]);

const currentChannelType = computed(() => channelConfig[messageTab.value]?.type || 'chat');
/**
 * 按日期分组消息
 */
const groupedMessages = computed(() => {
  if (!messages.value.length) return [];
  
  const groups: Array<{ dateLabel: string; messages: any[] }> = [];
  let currentDate = '';
  
  [...messages.value].sort((a, b) => getTimeValue(a.createdAt) - getTimeValue(b.createdAt)).forEach(msg => {
    const date = formatDateLabel(msg.createdAt);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ dateLabel: date, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  });
  
  return groups;
});

/**
 * 格式化日期标签
 */
const formatDateLabel = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

const getTimeValue = (iso: string) => {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const emptyTitle = computed(() => {
  if (!selectedStoreId.value) return '未设置当前店铺';
  if (messageTab.value === 'support') return '暂无客服消息';
  return '暂无消息';
});

const emptyDescription = computed(() => {
  if (!selectedStoreId.value) return '请先在顶部选择当前操作店铺';
  const type = currentChannelType.value;
  if (messageTab.value === 'support') return '客服暂无消息';
  if (type === 'chat') return '暂无消息';
  return `${messageTabs.value.find(t => t.value === messageTab.value)?.label || ''}暂无消息`;
});

const setTabCount = (tabValue: string, count: number) => {
  const target = messageTabs.value.find(tab => tab.value === tabValue);
  if (target) {
    target.count = count;
  }
};

const resetTabCounts = () => {
  messageTabs.value.forEach(tab => {
    tab.count = 0;
  });
};

const refreshAllTabCounts = async () => {
  if (!selectedStoreId.value) {
    resetTabCounts();
    return;
  }

  const countResults = await Promise.all(
    messageTabs.value.map(async (tab) => {
      if (isNoticeChannel(channelConfig, tab.value)) {
        return {
          tab: tab.value,
          count: sumUnreadCount(mapMockNoticeConversations(tab.value, getConversationsByChannel(tab.value))),
        };
      }

      try {
        const response = await ozonMessageAPI.getConversations(selectedStoreId.value!, {
          channel: tab.value,
          limit: 100,
        });
        const items = response.success ? (response.data?.conversations || []) : [];
        return {
          tab: tab.value,
          count: sumUnreadCount(items),
        };
      } catch {
        return { tab: tab.value, count: 0 };
      }
    })
  );

  countResults.forEach(({ tab, count }) => setTabCount(tab, count));
};

const handleMessageTabChange = async (tab: string) => {
  messageTab.value = tab as ChannelKey;
  selectedConversation.value = null;
  messages.value = [];
  await loadConversations();
};

const resetMessageState = () => {
  conversations.value = [];
  selectedConversation.value = null;
  messages.value = [];
  resetTabCounts();
};

const syncSelectedStoreContext = () => {
  selectedStoreId.value = storeContext.value?.resolvedStoreId ?? undefined;
};

const loadCurrentStore = async () => {
  storesLoading.value = true;
  try {
    const context = await loadStoreContext(true);
    syncSelectedStoreContext();
    if (context?.resolvedStoreId) {
      await loadConversations();
      void refreshAllTabCounts();
    } else {
      resetMessageState();
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载当前操作店铺失败');
  } finally {
    storeContextReady.value = true;
    storesLoading.value = false;
  }
};

const loadConversations = async () => {
  if (!selectedStoreId.value) {
    conversations.value = [];
    selectedConversation.value = null;
    messages.value = [];
    return;
  }
  conversationsLoading.value = true;
  selectedConversation.value = null;
  messages.value = [];
  try {
    if (isNoticeChannel(channelConfig, messageTab.value)) {
      conversations.value = mapMockNoticeConversations(
        messageTab.value,
        getConversationsByChannel(messageTab.value)
      ).map(normalizeConversation);
      setTabCount(messageTab.value, sumUnreadCount(conversations.value));
      return;
    }

    const response = await ozonMessageAPI.getConversations(selectedStoreId.value, {
      channel: messageTab.value,
      limit: 100,
    });

    if (!response.success) {
      throw new Error(response.message || '加载消息列表失败');
    }

    const items = Array.isArray(response.data?.conversations) ? response.data.conversations : [];
    conversations.value = items
      .map(normalizeConversation)
      .sort((a, b) => getTimeValue(b.updatedAt) - getTimeValue(a.updatedAt));
    setTabCount(messageTab.value, sumUnreadCount(conversations.value));
  } catch (error: any) {
    conversations.value = [];
    ElMessage.error(error.message || '加载消息列表失败');
  } finally {
    conversationsLoading.value = false;
  }
};

const selectConversation = async (conversation: typeof conversations.value[0]) => {
  // 清除未读计数
  const idx = conversations.value.findIndex(c => c.conversationId === conversation.conversationId);
  if (idx !== -1) {
    const updatedConversation = { ...conversations.value[idx], unreadCount: 0 };
    conversations.value.splice(idx, 1, updatedConversation);
    setTabCount(messageTab.value, sumUnreadCount(conversations.value));
    conversation = updatedConversation;
  }
  selectedConversation.value = conversation;
  messagesLoading.value = true;
  try {
    if (isNoticeChannel(channelConfig, messageTab.value)) {
      messages.value = mapMockNoticeMessages(
        getMessagesByChannel(messageTab.value, conversation.conversationId)
      );
      return;
    }

    const response = await ozonMessageAPI.getConversationMessages(
      selectedStoreId.value!,
      conversation.conversationId,
      { limit: 100 }
    );

    if (!response.success) {
      throw new Error(response.message || '加载消息详情失败');
    }

    const items = Array.isArray(response.data?.messages) ? response.data.messages : [];
    messages.value = items
      .map(message => normalizeMessage(message, conversation))
      .filter(message => message.text.trim())
      .sort((a, b) => getTimeValue(a.createdAt) - getTimeValue(b.createdAt));
  } catch (error: any) {
    messages.value = [];
    ElMessage.error(error.message || '加载消息详情失败');
  } finally {
    messagesLoading.value = false;
    await nextTick();
    scrollToBottom();
  }
};

const sendReply = async () => {
  if (!selectedStoreId.value || !selectedConversation.value || !replyText.value.trim()) {
    return;
  }
  sendingReply.value = true;
  try {
    const text = replyText.value.trim();
    const response = await ozonMessageAPI.sendReply(
      selectedStoreId.value,
      selectedConversation.value.conversationId,
      { text }
    );

    if (!response.success) {
      throw new Error(response.message || '发送失败');
    }

    const now = new Date().toISOString();
    const newMsg = {
      id: `local-${Date.now()}`,
      role: 'seller',
      buyerName: selectedConversation.value.buyerName,
      text,
      title: selectedConversation.value.buyerName || '回复',
      content: text,
      createdAt: now,
    };
    messages.value.push(newMsg);
    selectedConversation.value = {
      ...selectedConversation.value,
      lastMessage: text,
      updatedAt: now,
    };
    const conversationIndex = conversations.value.findIndex(
      item => item.conversationId === selectedConversation.value?.conversationId
    );
    if (conversationIndex !== -1) {
      conversations.value.splice(conversationIndex, 1, selectedConversation.value);
    }
    replyText.value = '';
    scrollToBottom();
  } catch (error: any) {
    ElMessage.error(error.message || '发送失败');
  } finally {
    sendingReply.value = false;
  }
};

/**
 * 时间显示：始终显示时间格式
 */
const formatTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatConversationTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = formatTime(iso);
  return isToday ? time : `${d.getMonth() + 1}-${d.getDate()}`;
};

const getAvatarText = (conversation: typeof conversations.value[0]) => {
  return (conversation.buyerName || '?').slice(0, 1);
};

const getConversationTitle = (conversation: typeof conversations.value[0]) => {
  if (currentChannelType.value === 'chat') {
    return conversation.buyerName;
  } else {
    return conversation.lastMessage;
  }
};

const getConversationSubtitle = (conversation: typeof conversations.value[0]) => {
  if (currentChannelType.value === 'chat') {
    return conversation.lastMessage || '暂无内容';
  } else {
    return conversation.buyerName || '暂无内容';
  }
};

onMounted(() => {
  void loadCurrentStore();
});

watch(
  () => storeContext.value?.resolvedStoreId ?? undefined,
  async (nextStoreId, prevStoreId) => {
    syncSelectedStoreContext();
    if (!storeContextReady.value || nextStoreId === prevStoreId) {
      return;
    }

    if (nextStoreId) {
      await loadConversations();
      void refreshAllTabCounts();
    } else {
      resetMessageState();
    }
  }
);
</script>

<style scoped>
.message-center-page {
  gap: 16px;
}

.reply-input :deep(.el-textarea__inner) {
  border: none !important;
  box-shadow: none !important;
  padding: 12px 16px;
  resize: none;
  font-size: 14px;
}
</style>
