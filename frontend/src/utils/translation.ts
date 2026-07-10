// 翻译字典文件
// 所有翻译统一管理，按需导入使用

export interface TranslationMap {
  [key: string]: string;
}

// 指标评分翻译（俄文→中文）
export const ratingTranslations: TranslationMap = {
  // 基础指标
  'cancellation_rate': '取消率',
  'defect_rate': '缺陷率',
  'submission_rating': '提交评分',
  'overall_rating': '综合评分',
  
  // 价格指数相关
  'Процент товаров в желтом зоне по прайс индексу': '价格指数黄色区域商品百分比',
  'Процент товаров в красной зоне по прайс индексу': '价格指数红色区域商品百分比',
  'Процент товаров в зеленой зоне по прайс индексу': '价格指数绿色区域商品百分比',
  'Процент товаров в \"желтом\" зоне по прайс индексу': '价格指数黄色区域商品百分比',
  'Процент товаров в \"красной\" зоне по прайс индексу': '价格指数红色区域商品百分比',
  'Процент товаров в \"зеленой\" зоне по прайс индексу': '价格指数绿色区域商品百分比',
  
  // 按销售模式分类的价格指数
  'Процент товаров в \"желтом\" зоне по прайс индексу (FBS)': '价格指数黄色区域商品百分比(FBS)',
  'Процент товаров в \"желтом\" зоне по прайс индексу (FBO)': '价格指数黄色区域商品百分比(FBO)',
  'Процент товаров в \"красной\" зоне по прайс индексу (FBS)': '价格指数红色区域商品百分比(FBS)',
  'Процент товаров в \"красной\" зоне по прайс индексу (FBO)': '价格指数红色区域商品百分比(FBO)',
  'Процент товаров в \"зеленой\" зоне по прайс индексу (FBS)': '价格指数绿色区域商品百分比(FBS)',
  'Процент товаров в \"зеленой\" зоне по прайс индексу (FBO)': '价格指数绿色区域商品百分比(FBO)',
  
  // 跨境模式价格指数
  'Процент товаров в \"желтом\" зоне по прайс индексу (Crossborder)': '价格指数黄色区域商品百分比(跨境)',
  'Процент товаров в \"красной\" зоне по прайс индексу (Crossborder)': '价格指数红色区域商品百分比(跨境)',
  'Процент товаров в \"зеленой\" зоне по прайс индексу (Crossborder)': '价格指数绿色区域商品百分比(跨境)',
  
  // 发货相关
  'Процент просроченных отгрузок (global)': '逾期发货百分比(全局)',
  'Процент просроченных отгрузок (FBS)': '逾期发货百分比(FBS)',
  'Процент просроченных отгрузок (FBO)': '逾期发货百分比(FBO)',
  'Процент просроченных отгрузок (Crossborder)': '逾期发货百分比(跨境)',
  'Соблюдение сроков отгрузки': '发货时效达标率',
  'Среднее время обработки заказов': '订单平均处理时间',
  
  // 商品相关
  'Оценка товаров': '商品评分',
  'Количество недостающих товаров': '缺失商品数量',
  'Срок хранения товаров на складе': '商品仓储时长',
  'Процент поврежденных товаров': '商品损坏率',
  'Качество фото товаров': '商品图片质量',
  'Полнота описания товаров': '商品描述完整度',
  
  // 投诉与退换
  'Жалобы на FBO': 'FBO投诉',
  'Жалобы на FBS': 'FBS投诉',
  'Процент возвратов': '退货率',
  

  // 阴性形式变体（Ozon API 实际返回）
  'Процент товаров в \""желтой\"" зоне по прайс индексу': '价格指数黄色区域商品百分比',
  'Процент товаров в \""красной\"" зоне по прайс индексу': '价格指数红色区域商品百分比',
  'Процент товаров в \""зеленой\"" зоне по прайс индексу': '价格指数绿色区域商品百分比',
  'Процент просроченных отгрузки (global)': '逾期发货百分比(全局)',
  'Рейтинг по профессиональной упаковке': '专业包装评分',
  'Жалобы по FBO': 'FBO投诉',
  'Жалобы по FBS': 'FBS投诉',
  'Жалобы по rFBS': 'rFBS投诉',
  'Рейтинг по прогрессивной шкале': '渐进评分',

  // 2026-06-18 数据库实际 key（单引号/拼写差异）
  "Процент товаров в 'зелёной' зоне по прайс индексу": '价格指数绿色区域商品百分比',
  "Процент товаров в 'жёлтой' зоне по прайс индексу": '价格指数黄色区域商品百分比',
  "Процент товаров в 'красной' зоне по прайс индексу": '价格指数红色区域商品百分比',
  "Процент товаров в 'супервыгодной' зоне по прайс индексу": '价格指数超级优惠区域商品百分比',
  'Процент просрочек отгрузки (global)': '逾期发货百分比(全局)',
  // 财务相关
  'Отсутствие по торгocomиссии выставе': '佣金账单缺失',
};

// 国家代码翻译
export const countryTranslations: TranslationMap = {
  'RU': '俄罗斯',
  'KZ': '哈萨克斯坦',
  'BY': '白俄罗斯',
  'CN': '中国',
};

// 税务系统翻译
export const taxSystemTranslations: TranslationMap = {
  '0': '未知',
  '1': '简化税',
  '2': '一般税',
};

// 订阅类型翻译
export const subscriptionTypeTranslations: TranslationMap = {
  '0': '所有',
  '1': '每日',
  '2': '每周',
  '3': '每月',
};

// 商品状态翻译
export const productStatusTranslations: TranslationMap = {
  'creating': '创建中',
  'created': '已创建',
  'processing': '处理中',
  'processed': '已处理',
  'moderating': '审核中',
  'moderated': '已审核',
  'importing': '导入中',
  'imported': '已导入',
};

// 价格指数颜色翻译
export const colorIndexTranslations: TranslationMap = {
  'green': '价格优秀',
  'yellow': '价格良好',
  'orange': '价格偏高',
  'red': '价格过高',
};

// 同步状态翻译
export const syncStatusTranslations: TranslationMap = {
  'price_sent': '价格已同步',
};

// 审核状态翻译
export const moderateStatusTranslations: TranslationMap = {
  'approved': '审核通过',
};

// 校验状态翻译
export const validationStatusTranslations: TranslationMap = {
  'success': '校验成功',
};

// 翻译函数
export const translate = (key: string, translations: TranslationMap, fallback?: string): string => {
  return translations[key] || fallback || key;
};

// 指标评分翻译便捷函数
export const translateRating = (name: string): string => {
  return translate(name, ratingTranslations);
};

// 国家名称翻译便捷函数
export const translateCountry = (code: string): string => {
  return translate(code, countryTranslations, code);
};

// 税务系统翻译便捷函数
export const translateTaxSystem = (code?: number | string): string => {
  if (code === undefined || code === null) return '未知';
  return translate(String(code), taxSystemTranslations, '未知');
};

// 订阅类型翻译便捷函数
export const translateSubscriptionType = (code?: number | string): string => {
  if (code === undefined || code === null) return '未知';
  return translate(String(code), subscriptionTypeTranslations, '未知');
};

// 商品状态翻译便捷函数
export const translateProductStatus = (status: string): string => {
  return translate(status, productStatusTranslations, status);
};

// 价格指数颜色翻译便捷函数
export const translateColorIndex = (color: string): string => {
  return translate(color, colorIndexTranslations, '未知');
};

// 同步状态翻译便捷函数
export const translateSyncStatus = (status: string): string => {
  return translate(status, syncStatusTranslations, status);
};

// 审核状态翻译便捷函数
export const translateModerateStatus = (status: string): string => {
  return translate(status, moderateStatusTranslations, status);
};

// 校验状态翻译便捷函数
export const translateValidationStatus = (status: string): string => {
  return translate(status, validationStatusTranslations, status);
};
