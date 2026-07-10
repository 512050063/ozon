/**
 * 消息中心 Mock 数据
 *
 * 分类：
 * - 对话消息（buyer、support）：需要双方对话
 *   字段：id, role('buyer'|'seller'), buyerName, text, createdAt, unreadCount
 * - 新闻消息（main、notification、promotion、training、finance）：单向通知
 *   字段：id, sender, title, content, createdAt, unreadCount
 */

export interface MockChatItem {
  id: string;
  role: 'buyer' | 'seller';
  buyerName: string;
  text: string;
  createdAt: string;
  unreadCount?: number;
}

export interface MockNoticeItem {
  id: string;
  sender: string;
  title: string;
  content: string;
  createdAt: string;
  unreadCount?: number;
}

// ===== 对话消息：买家 =====
export const buyerChats: MockChatItem[] = [
  {
    id: 'b1-1',
    role: 'buyer',
    buyerName: 'Alexey',
    text: '您好，请问这款商品有现货吗？',
    createdAt: getRelativeDate(0, 15, 30),
    unreadCount: 1,
  },
  {
    id: 'b1-2',
    role: 'seller',
    buyerName: 'Alexey',
    text: '您好！有的，这款商品目前库存充足，可以立即发货。',
    createdAt: getRelativeDate(0, 15, 32),
  },
  {
    id: 'b1-3',
    role: 'buyer',
    buyerName: 'Alexey',
    text: '太好了！大概几天能到莫斯科？',
    createdAt: getRelativeDate(0, 15, 35),
    unreadCount: 1,
  },
  {
    id: 'b1-4',
    role: 'seller',
    buyerName: 'Alexey',
    text: '一般2-3个工作日就能送达，我们使用的是特快专递。',
    createdAt: getRelativeDate(0, 15, 38),
  },
];

export const buyerConversations: MockChatItem[][] = [
  buyerChats.slice(0, 4),
  [
    {
      id: 'b2-1',
      role: 'buyer',
      buyerName: 'Ekaterina',
      text: '订单什么时候发货？订单号是 OZ123456789',
      createdAt: getRelativeDate(0, 14, 20),
    },
    {
      id: 'b2-2',
      role: 'seller',
      buyerName: 'Ekaterina',
      text: '您好！您的订单已经打包完成，今天下午会安排发货。',
      createdAt: getRelativeDate(0, 14, 25),
    },
    {
      id: 'b2-3',
      role: 'seller',
      buyerName: 'Ekaterina',
      text: '发货后我会及时更新物流信息，请留意通知。',
      createdAt: getRelativeDate(0, 14, 26),
    },
  ],
  [
    {
      id: 'b3-1',
      role: 'buyer',
      buyerName: 'Dmitry',
      text: '能优惠一点吗？',
      createdAt: getRelativeDate(0, 13, 15),
      unreadCount: 2,
    },
    {
      id: 'b3-2',
      role: 'seller',
      buyerName: 'Dmitry',
      text: '您好！这款商品目前已经是促销价格了，比原价优惠了20%哦。',
      createdAt: getRelativeDate(0, 13, 18),
    },
    {
      id: 'b3-3',
      role: 'seller',
      buyerName: 'Dmitry',
      text: '如果您购买两件，可以再给您额外优惠5%',
      createdAt: getRelativeDate(0, 13, 19),
    },
    {
      id: 'b3-4',
      role: 'buyer',
      buyerName: 'Dmitry',
      text: '那我买两件！',
      createdAt: getRelativeDate(0, 13, 22),
      unreadCount: 2,
    },
    {
      id: 'b3-5',
      role: 'seller',
      buyerName: 'Dmitry',
      text: '好的，已为您备注额外优惠，下单后自动抵扣。',
      createdAt: getRelativeDate(0, 13, 25),
    },
  ],
  [
    {
      id: 'b4-1',
      role: 'buyer',
      buyerName: 'Maria',
      text: '收到货了，质量很好！',
      createdAt: getRelativeDate(1, 16, 45),
    },
    {
      id: 'b4-2',
      role: 'seller',
      buyerName: 'Maria',
      text: '感谢您的好评！很高兴您对商品满意。',
      createdAt: getRelativeDate(1, 16, 48),
    },
    {
      id: 'b4-3',
      role: 'seller',
      buyerName: 'Maria',
      text: '期待您的下次光临！如有任何问题随时联系我们。',
      createdAt: getRelativeDate(1, 16, 49),
    },
  ],
];

// ===== 对话消息：客服（部分为空，演示空状态） =====
// 注意：客服频道为空数组，演示空状态样式
export const supportConversations: MockChatItem[][] = [];

// ===== 新闻消息 =====

// 主要
export const mainNotices: MockNoticeItem[][] = [
  [
    {
      id: 'm1-1',
      sender: '平台公告',
      title: '中华人民共和国海关总署要求的更新',
      content: '根据最新的海关规定，所有出口商品需要提供额外的报关文件。请您在发货前确保所有文件已准备齐全。\n\n详细要求请参考附件中的海关公告。如有疑问，请联系平台客服。',
      createdAt: getRelativeDate(5, 10, 30),
      unreadCount: 1,
    },
    {
      id: 'm1-2',
      sender: '平台公告',
      title: '报关文件提交指南',
      content: '为了帮助您顺利提交报关文件，我们整理了详细的操作指南：\n\n1. 登录卖家后台，进入"订单管理"页面\n2. 选择需要报关的订单\n3. 上传相关文件\n4. 确认提交\n\n如有任何问题，请随时联系客服。',
      createdAt: getRelativeDate(5, 11, 0),
    },
    {
      id: 'm1-3',
      sender: '平台公告',
      title: '海关政策更新提醒',
      content: '温馨提醒：海关政策将于下周一开始正式实施，请提前做好准备。\n\n如有疑问，欢迎致电客服热线：400-xxx-xxxx',
      createdAt: getRelativeDate(5, 14, 30),
    },
  ],
  [
    {
      id: 'm2-1',
      sender: '平台调研',
      title: '请分享您对Global University的意见',
      content: '尊敬的卖家，我们正在收集卖家对新大学培训平台的反馈。您的意见对我们非常重要！\n\n请点击下方链接参与调查，完成后将获得50积分奖励。',
      createdAt: getRelativeDate(10, 14, 20),
    },
    {
      id: 'm2-2',
      sender: '平台调研',
      title: '调研问卷填写提醒',
      content: '您好，您尚未完成我们的调研问卷。这份问卷仅需5分钟，完成后即可获得50积分奖励。\n\n请尽快完成，感谢您的支持！',
      createdAt: getRelativeDate(10, 16, 0),
    },
  ],
  [
    {
      id: 'm3-1',
      sender: '平台通知',
      title: '内容、质量和价格',
      content: '利用额外限额，扩展热门类目商品\n\n尊敬的卖家，您的店铺已获得额外的类目限额。现在可以在更多类目下发布商品了！',
      createdAt: getRelativeDate(12, 9, 15),
      unreadCount: 2,
    },
    {
      id: 'm3-2',
      sender: '平台通知',
      title: '类目限额使用说明',
      content: '新的类目限额已生效，您可以在以下类目发布更多商品：\n\n• 电子产品\n• 家居用品\n• 时尚配饰\n\n请注意遵守各类目的发布规则。',
      createdAt: getRelativeDate(12, 10, 30),
    },
  ],
];

// 通知（部分为空，演示空状态）
export const notificationNotices: MockNoticeItem[][] = [
  [
    {
      id: 'n1-1',
      sender: '系统通知',
      title: '您的店铺订单量已达到每日上限',
      content: '今日订单量已达到平台规定的每日上限。新订单将在明日0点后自动处理。\n\n如有紧急订单，请联系客服申请临时额度。',
      createdAt: getRelativeDate(0, 16, 45),
      unreadCount: 1,
    },
    {
      id: 'n1-2',
      sender: '系统通知',
      title: '订单处理进度提醒',
      content: '您店铺今日的订单正在处理中，预计今晚22:00前完成全部发货。\n\n如有特殊需求，请联系客服加急处理。',
      createdAt: getRelativeDate(0, 17, 30),
    },
    {
      id: 'n1-3',
      sender: '系统通知',
      title: '库存预警提醒',
      content: '您店铺中有3件商品库存不足10件，请及时补货：\n\n• 商品A - 剩余5件\n• 商品B - 剩余3件\n• 商品C - 剩余8件',
      createdAt: getRelativeDate(0, 18, 0),
    },
  ],
  [
    {
      id: 'n2-1',
      sender: '平台公告',
      title: 'Ozon平台系统维护通知',
      content: '平台将于6月20日0:00-6:00进行系统维护。维护期间，订单处理、商品上传等功能将暂停。\n\n请提前做好准备，感谢您的理解与支持！',
      createdAt: getRelativeDate(1, 11, 0),
    },
    {
      id: 'n2-2',
      sender: '平台公告',
      title: '维护进度更新',
      content: '系统维护准备工作已开始，预计提前完成。我们会第一时间通知您。',
      createdAt: getRelativeDate(1, 10, 0),
    },
  ],
];

// 推广
export const promotionNotices: MockNoticeItem[][] = [
  [
    {
      id: 'p1-1',
      sender: '促销活动',
      title: '夏季大促活动报名开始',
      content: '限时优惠进行中，报名即可享受专属流量扶持！\n\n活动时间：2024年6月20日-7月5日\n\n立即报名，抢占夏季流量红利！',
      createdAt: getRelativeDate(0, 10, 30),
      unreadCount: 1,
    },
    {
      id: 'p1-2',
      sender: '促销活动',
      title: '夏季大促预热活动开启',
      content: '距离夏季大促还有5天！提前预热，锁定流量！\n\n预热期间发布新品可获得双倍曝光机会。',
      createdAt: getRelativeDate(0, 11, 0),
    },
    {
      id: 'p1-3',
      sender: '促销活动',
      title: '活动报名截止提醒',
      content: '夏季大促活动报名将于明天下午6点截止，请尽快完成报名！',
      createdAt: getRelativeDate(0, 14, 0),
    },
  ],
  [
    {
      id: 'p2-1',
      sender: '新卖家福利',
      title: '新卖家专享30天流量扶持计划',
      content: '新入驻卖家专享30天流量扶持计划\n\n活动期间，新店铺将获得额外的曝光机会和专属客服支持。',
      createdAt: getRelativeDate(3, 8, 0),
    },
    {
      id: 'p2-2',
      sender: '新卖家福利',
      title: '新手礼包领取提醒',
      content: '恭喜您入驻Ozon！请领取您的新卖家礼包：\n\n• 100积分\n• 免费店铺装修模板\n• 专属客服1对1指导',
      createdAt: getRelativeDate(3, 9, 0),
    },
  ],
];

// 培训
export const trainingNotices: MockNoticeItem[][] = [
  [
    {
      id: 't1-1',
      sender: '新手教程',
      title: '如何将退货转化为利润？我们准备了新的培训课程',
      content: '尊敬的卖家！\n\n您现在可以通过WHD仓库来发送已取消的订单和客户退货，告别漫长的等待和运回您所在国家的额外费用。请学习新课程，您将了解：\n\n • 这种处理已取消订单和退货的方法有哪些优势；\n • 如何通过WHD仓库发送退货；\n • 商品必须满足哪些条件才能发送至二次销售。\n\n请让退货成为收入来源，而非损失！',
      createdAt: getRelativeDate(0, 10, 22),
      unreadCount: 1,
    },
  ],
  [
    {
      id: 't2-1',
      sender: '进阶课程',
      title: '数据分析与运营策略实战指南',
      content: '掌握数据驱动的运营方法，提升店铺业绩！\n\n课程内容包括：销售数据分析、库存管理、定价策略等。',
      createdAt: getRelativeDate(5, 14, 30),
    },
  ],
];

// 警告
export const warningNotices: MockNoticeItem[][] = [
  [
    {
      id: 'w1-1',
      sender: '系统警告',
      title: '账户安全风险提醒',
      content: '检测到您的账户在新设备上登录！\n\n登录时间：2024-06-15 16:30:00\n登录地点：未知\n设备类型：Android手机\n\n如果这不是您的操作，请立即修改密码并联系客服。',
      createdAt: getRelativeDate(0, 10, 30),
      unreadCount: 1,
    },
    {
      id: 'w1-2',
      sender: '系统警告',
      title: '密码即将过期',
      content: '您的账户密码将在3天后过期，请及时修改密码以确保账户安全。\n\n修改密码路径：设置 > 账户安全 > 修改密码',
      createdAt: getRelativeDate(0, 11, 0),
    },
    {
      id: 'w1-3',
      sender: '系统警告',
      title: '店铺违规提醒',
      content: '您的店铺存在以下违规行为：\n\n• 商品描述与实际不符（订单号：OZ123456789）\n• 延迟发货超过24小时（订单号：OZ987654321）\n\n请在24小时内处理，否则将影响店铺评分。',
      createdAt: getRelativeDate(0, 14, 0),
      unreadCount: 2,
    },
  ],
  [
    {
      id: 'w2-1',
      sender: '系统警告',
      title: '退款率过高警告',
      content: '您店铺的退款率已超过平台规定的阈值（5%）。\n\n当前退款率：7.2%\n建议：检查商品质量，优化售后服务，降低退款率。',
      createdAt: getRelativeDate(1, 11, 0),
    },
    {
      id: 'w2-2',
      sender: '系统警告',
      title: '退款率整改通知',
      content: '针对您店铺退款率过高的问题，请在7天内完成整改。\n\n整改要求：将退款率降至5%以下\n\n整改期间，部分功能将受到限制。',
      createdAt: getRelativeDate(1, 10, 0),
    },
  ],
];

// 金融服务（部分为空，演示空状态）
export const financeNotices: MockNoticeItem[][] = [];

/**
 * 工具：生成相对今天的日期
 * @param dayOffset 距今天多少天（0=今天，1=昨天，5=5天前）
 * @param hour 小时
 * @param minute 分钟
 */
function getRelativeDate(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * 频道配置
 *  - type: 'chat' 对话消息 / 'notice' 新闻消息
 *  - empty: 是否为空（演示空状态）
 */
export const channelConfig: Record<
  string,
  {
    type: 'chat' | 'notice';
    label: string;
  }
> = {
  buyer: { type: 'chat', label: '买家' },
  support: { type: 'chat', label: '客服' },
  main: { type: 'notice', label: '主要' },
  notification: { type: 'notice', label: '通知' },
  warning: { type: 'notice', label: '警告' },
  promotion: { type: 'notice', label: '推广' },
  training: { type: 'notice', label: '培训' },
  finance: { type: 'notice', label: '金融服务' },
};

/**
 * 根据频道获取所有会话（按买家/消息分组）
 */
export function getConversationsByChannel(channel: string): Array<{
  conversationId: string;
  buyerName: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
}> {
  const config = channelConfig[channel];
  if (!config) return [];

  const items =
    config.type === 'chat'
      ? getChannelChats(channel)
      : getChannelNotices(channel);

  return items.map((item, index) => {
    const list = item as any[];
    const last = list[list.length - 1];
    const unread = list.reduce((sum, m) => sum + (m.unreadCount || 0), 0);
    return {
      conversationId: `${channel}-${index + 1}`,
      buyerName: config.type === 'chat' ? last.buyerName : last.title,
      lastMessage: config.type === 'chat' ? last.text : last.sender,
      updatedAt: last.createdAt,
      unreadCount: unread,
    };
  });
}

/**
 * 根据频道和会话id获取消息列表
 */
export function getMessagesByChannel(
  channel: string,
  conversationId: string
): any[] {
  const config = channelConfig[channel];
  if (!config) return [];

  const items =
    config.type === 'chat'
      ? getChannelChats(channel)
      : getChannelNotices(channel);

  const index = parseInt(conversationId.split('-').pop() || '1') - 1;
  return items[index] || [];
}

function getChannelChats(channel: string): MockChatItem[][] {
  if (channel === 'buyer') return buyerConversations;
  if (channel === 'support') return supportConversations;
  return [];
}

function getChannelNotices(channel: string): MockNoticeItem[][] {
  if (channel === 'main') return mainNotices;
  if (channel === 'notification') return notificationNotices;
  if (channel === 'warning') return warningNotices;
  if (channel === 'promotion') return promotionNotices;
  if (channel === 'training') return trainingNotices;
  if (channel === 'finance') return financeNotices;
  return [];
}
