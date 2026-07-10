import { ref, type Ref } from 'vue';
import type { Placement } from 'element-plus';

type TranslationItem = { code?: string; message?: string; level?: string };

export const useProductStatusDisplay = (options: {
  products: Ref<any[]>;
  translateErrors: (items: TranslationItem[]) => Promise<any>;
}) => {
  const errorCodeMap = ref<Record<string, string>>({});
  const errorMessageMap = ref<Record<string, string>>({});
  const translatingErrorMessages = ref(false);

  const normalizeTranslationKey = (value: any): string => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const isLikelyChineseText = (value: string): boolean => /[\u4e00-\u9fff]/.test(value);
  const isRawPayloadText = (value: string): boolean => {
    const text = String(value || '').trim();
    if (!text) return false;
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) return true;
    return /"?(DUPLICATES|OFFERID|COMPANYID|attribute_id|attribute_name)"?/i.test(text);
  };
  const isUsableChineseTranslation = (value: string): boolean => {
    const text = String(value || '').trim();
    return isLikelyChineseText(text) && !isRawPayloadText(text);
  };
  const escapeHtml = (value: any): string => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const getStoredTranslation = (code: string, message?: string): string => {
    const normalizedCode = normalizeTranslationKey(code);
    const normalizedMessage = normalizeTranslationKey(message);
    const codeTranslation = normalizedCode ? errorCodeMap.value[normalizedCode] : '';
    const messageTranslation = normalizedMessage ? errorMessageMap.value[normalizedMessage] : '';
    if (codeTranslation && isUsableChineseTranslation(codeTranslation)) return codeTranslation;
    if (messageTranslation && isUsableChineseTranslation(messageTranslation)) return messageTranslation;
    return '';
  };

  const translateAttributeName = (name: string): string => {
    const map: Record<string, string> = {
      'Цвет товара': '商品颜色',
      'Российский размер': '俄罗斯尺码',
      density: '密度',
    };
    return map[name] || name;
  };

  const translateKnownValidationMessage = (message: string): string => {
    const text = String(message || '').trim();
    if (!text) return '';
    const outOfRangeMatch = text.match(/^'([^']+)'\s+is\s+out\s+of\s+range\s+\(min:\s*([^,]+),\s*max:\s*([^)]+)\)$/i);
    if (outOfRangeMatch) {
      return `${translateAttributeName(outOfRangeMatch[1])} 超出允许范围，最小值 ${outOfRangeMatch[2]}，最大值 ${outOfRangeMatch[3]}`;
    }
    return '';
  };

  const translateErrorToZh = (code: string, russianMessage: string): string => {
    const storedTranslation = getStoredTranslation(code, russianMessage);
    if (storedTranslation) return storedTranslation;
    const patternTranslation = translateKnownValidationMessage(russianMessage);
    if (patternTranslation) return patternTranslation;
    const builtInMap: Record<string, string> = {
      ERR_ATTRIBUTE_REQUIRED: '缺少必填属性',
      ERR_ATTRIBUTE_INVALID: '属性值无效',
      ERR_IMAGE_REQUIRED: '缺少商品图片',
      ERR_IMAGE_INVALID: '图片无效',
      ERR_IMAGE_SIZE: '图片尺寸不符合要求',
      ERR_PRICE_INVALID: '价格设置无效',
      ERR_PRICE_MIN: '价格低于最低限制',
      ERR_NAME_REQUIRED: '缺少商品名称',
      ERR_NAME_TOO_LONG: '商品名称过长',
      ERR_DESCRIPTION_REQUIRED: '缺少商品描述',
      ERR_BRAND_REQUIRED: '缺少品牌信息',
      ERR_CATEGORY_REQUIRED: '类目未设置',
      ERR_CATEGORY_INVALID: '类目无效',
      SPU_ALREADY_EXISTS_IN_ANOTHER_ACCOUNT: '该商品 SPU 已存在于另一个账号',
      error_attribute_values_out_of_range: '属性值不是最新值，请重新选择属性值',
      BR_hashtags_symbols_validation: '标签只能包含字母、数字、井号和下划线，请用空格分隔多个标签',
    };
    if (builtInMap[code]) return builtInMap[code];
    const normalizedCode = normalizeTranslationKey(code);
    const matchedKey = Object.keys(builtInMap).find(key => normalizeTranslationKey(key) === normalizedCode);
    if (matchedKey) return builtInMap[matchedKey];
    return russianMessage || code || '未知错误';
  };

  const getErrorParamValue = (error: any, name: string): string => {
    const params = Array.isArray(error?.texts?.params) ? error.texts.params : [];
    const matched = params.find((param: any) => normalizeTranslationKey(param?.name) === normalizeTranslationKey(name));
    return String(matched?.value || '');
  };

  const parseDuplicateOfferIds = (error: any): string[] => {
    const fromParams = getErrorParamValue(error, 'Duplicates') || getErrorParamValue(error, 'Articles');
    if (fromParams) {
      return fromParams.split(',').map(part => part.trim()).filter(Boolean);
    }

    const rawMessage = String(error?.message || error?.texts?.message || '').trim();
    if (!rawMessage || !isRawPayloadText(rawMessage)) return [];

    try {
      const parsed = JSON.parse(rawMessage);
      if (Array.isArray(parsed?.DUPLICATES)) {
        return parsed.DUPLICATES.map((item: any) => {
          const offerId = item?.OFFERID || item?.offerId || '';
          const companyId = item?.COMPANYID || item?.companyId || '';
          return [offerId, companyId].filter(Boolean).join(' - ');
        }).filter(Boolean);
      }
      if (Array.isArray(parsed?.OFFERID)) {
        return parsed.OFFERID.map((item: any) => String(item)).filter(Boolean);
      }
    } catch {
      return [];
    }

    return [];
  };

  const getProductRawData = (product: any): any => {
    const rawData = product?.product?.ozonOriginalData;
    if (!rawData) return null;
    if (typeof rawData === 'string') {
      try { return JSON.parse(rawData); } catch { return null; }
    }
    return rawData;
  };

  const getStatusExtraInfo = (product: any): { description: string; tooltip: string } => {
    const data = getProductRawData(product);
    if (!data?.statuses) return { description: '', tooltip: '' };
    const s = Array.isArray(data.statuses) ? data.statuses[0] : data.statuses;
    return {
      description: s.status_description || '',
      tooltip: s.status_tooltip || '',
    };
  };

  const translateStatusFailed = (reason: string): string => {
    const storedTranslation = getStoredTranslation(`STATUS_FAILED:${reason}`, reason);
    if (storedTranslation) return storedTranslation;
    const map: Record<string, string> = {
      declined: '被平台拒绝',
      rejected: '审核未通过',
      violation_copy_prohibition: '违反了平台复制禁令',
      violation: '违反平台规则',
      blocked: '已被封禁',
      out_of_stock: '缺货',
      not_for_sale: '不出售',
      imported: '未通过验证',
      moderated: '待重新发布',
      other: '其他原因',
    };
    return map[reason] || reason;
  };

  const translateStatusDescription = (desc: string): string => {
    if (!desc) return '';
    const map: Record<string, string> = {
      'Убран из продажи': '已停止销售',
      'Убран из продажи по причине нарушения правил': '因违反规则已从销售中移除',
      'Товар отклонен модератором': '商品已被审核员拒绝',
      'Товар заблокирован': '商品已被封禁',
      'Товар архивирован': '商品已归档',
      'Не обновлен': '未更新',
      'Не создан': '未创建',
      'Не прошел валидацию': '未通过验证',
      'Нет на складе': '没有库存',
      'Можно создать новую поставку или указать количество на своем складе': '可以创建新的供货，或填写自己仓库中的库存数量',
      'Нет на складе Можно создать новую поставку или указать количество на своем складе': '没有库存。可以创建新的供货，或填写自己仓库中的库存数量',
      'Не удалось обновить товар — покупатели видят его без изменений. Опубликуйте карточку заново: нажмите на три точки → Редактировать товар → Отправить': '未能更新商品，买家仍看到未变更的版本。请重新发布商品：点击三个点 → 编辑商品 → 发送',
    };
    const normalizedDesc = normalizeTranslationKey(desc);
    const matchedKey = Object.keys(map).find(key => normalizeTranslationKey(key) === normalizedDesc);
    if (matchedKey) return map[matchedKey];
    const storedTranslation = getStoredTranslation(`STATUS_DESCRIPTION:${desc}`, desc)
      || getStoredTranslation(`STATUS_TOOLTIP:${desc}`, desc);
    if (storedTranslation) return storedTranslation;
    return desc;
  };

  const buildProductIssueMessage = (error: any): { message: string; detail?: string; code: string } => {
    const code = error?.code || error?.texts?.code || '';
    const rawMessage = error?.message || error?.texts?.message || '';
    const rawDescription = error?.texts?.description || error?.description || '';
    const attributeName = translateAttributeName(error?.texts?.attribute_name || getErrorParamValue(error, 'attribute_name') || '');

    if (code === 'SPU_ALREADY_EXISTS_IN_ANOTHER_ACCOUNT') {
      const duplicates = parseDuplicateOfferIds(error);
      return {
        code,
        message: duplicates.length > 0 ? `类似商品已存在：${duplicates.join('，')}` : '该商品 SPU 已存在于另一个账号',
        detail: '请检查重复商品，必要时修改变体特征或合并商品。',
      };
    }

    if (code === 'error_attribute_values_out_of_range' || code === 'warning_attribute_values_out_of_range') {
      return {
        code,
        message: `${attributeName ? `${attributeName}：` : ''}属性值不是最新值，请重新选择属性值`,
        detail: '请在属性下拉列表中重新选择，不要手动填写旧值。',
      };
    }

    if (code === 'double_without_merger_offer') {
      const offers = parseDuplicateOfferIds(error);
      return {
        code,
        message: offers.length > 0 ? `无法与其他商品合并，变体特征与这些货号重复：${offers.join('，')}` : '无法与其他商品合并，变体特征重复',
        detail: '请至少修改一个变体特征。',
      };
    }

    const translated = translateErrorToZh(code, rawMessage);
    const fallback = rawDescription && !isRawPayloadText(rawDescription) ? rawDescription : translated;
    return {
      code,
      message: translated && !isRawPayloadText(translated) ? translated : translateStatusDescription(fallback),
    };
  };

  const upsertLoadedTranslations = (items: any[]) => {
    const nextCodeMap = { ...errorCodeMap.value };
    const nextMessageMap = { ...errorMessageMap.value };
    for (const item of items || []) {
      if (!item?.messageZh || !isUsableChineseTranslation(item.messageZh)) continue;
      if (item.code) nextCodeMap[normalizeTranslationKey(item.code)] = item.messageZh;
      if (item.messageRu) nextMessageMap[normalizeTranslationKey(item.messageRu)] = item.messageZh;
    }
    errorCodeMap.value = nextCodeMap;
    errorMessageMap.value = nextMessageMap;
  };

  const loadStoredTranslations = (items: any[]) => {
    errorCodeMap.value = {};
    errorMessageMap.value = {};
    upsertLoadedTranslations(items);
  };

  const getEffectiveStatus = (item: any): string => {
    const p = item.product || {};
    const isAutoArchived = p.isAutoArchived;
    const isArchived = p.isArchived;
    const hasWarnings = p.hasWarnings;
    const statusName = p.statusName || '';
    const totalStock = p.totalStock || 0;
    const ozonSku = p.ozonSku;
    const isSellingStatus = statusName === 'Продается' || statusName === '袩褉芯写邪械褌褋褟';
    const isReadyStatus = statusName.includes('Готов к продаже') || statusName.includes('准备销售');
    const isNotForSaleStatus = statusName.includes('Не продается') || statusName.includes('不出售');
    const hasSku = ozonSku && ozonSku !== 0 && ozonSku !== '0';
    if (isAutoArchived) return 'autoArchived';
    if (isArchived) return 'archived';
    if (!hasSku) return 'error';
    if (isSellingStatus) return 'selling';
    if (isNotForSaleStatus) return 'error';
    if (totalStock === 0 || isReadyStatus || hasWarnings) return 'pending';
    if (totalStock > 0) return 'selling';
    return 'error';
  };

  const getStatusBadgeStyle = (product: any): Record<string, string> => {
    const s = getEffectiveStatus(product);
    if (s === 'archived' || s === 'autoArchived') return { backgroundColor: '#ede9fe', color: '#7c3aed' };
    if (s === 'selling') return { backgroundColor: '#dcfce7', color: '#16a34a' };
    if (s === 'pending') return { backgroundColor: '#fff7ed', color: '#ea580c' };
    return { backgroundColor: '#f1f5f9', color: '#64748b' };
  };

  const getStatusLabel = (product: any): string => {
    const s = getEffectiveStatus(product);
    const map: Record<string, string> = {
      autoArchived: '自动档案',
      archived: '档案',
      selling: '在售',
      pending: '准备出售',
      error: '不出售',
    };
    return map[s] || '不出售';
  };

  const getProductIssueList = (product: any, expectedLevel: string): any[] => {
    const data = getProductRawData(product);
    const errors = Array.isArray(data?.errors) ? data.errors : [];
    return errors.filter((e: any) => {
      const level = e.level || e.texts?.level;
      return level === expectedLevel;
    }).map((e: any) => {
      const code = e.code || e.texts?.code || '';
      const rawMsg = e.message || e.texts?.message || '';
      return {
        code,
        message: translateErrorToZh(code, rawMsg),
        rawMessage: rawMsg,
        level: e.level || e.texts?.level || '',
        raw: e,
      };
    });
  };

  const getProductErrorList = (product: any): any[] => getProductIssueList(product, 'ERROR_LEVEL_ERROR');
  const getProductWarningList = (product: any): any[] => getProductIssueList(product, 'ERROR_LEVEL_WARNING');

  const getStatusSubtitle = (product: any): string => {
    const s = getEffectiveStatus(product);
    const stock = product.stock || 0;
    const p = product.product || {};
    if (s === 'archived' || s === 'autoArchived') return '';
    const extra = getStatusExtraInfo(product);
    if (extra.description && extra.description !== 'none') {
      return translateStatusDescription(extra.description);
    }
    if (s === 'error') {
      const statusName = p.statusName || '';
      const visibility = p.visibility || '';
      const hasSku = p.ozonSku && p.ozonSku !== 0 && p.ozonSku !== '0';
      if (!hasSku) return '未创建';
      const isNotForSale = statusName.includes('Не продается') || statusName.includes('不出售');
      if (isNotForSale || visibility === 'INVISIBLE') return '已停止销售';
      if (stock === 0) return '库存不足';
      return '';
    }
    if (s === 'pending') {
      if (stock === 0) return '库存不足';
      const warnings = getProductWarningList(product);
      if (warnings.length > 0) return `${warnings.length}条警告`;
      return '';
    }
    return '';
  };

  const getStatusBadgeCount = (product: any): number => {
    const s = getEffectiveStatus(product);
    if (s === 'archived' || s === 'autoArchived') return 0;
    const errors = getProductErrorList(product).length;
    if (errors > 0) return errors;
    const warnings = getProductWarningList(product).length;
    if (warnings > 0) return warnings;
    const extra = getStatusExtraInfo(product);
    if (s === 'error' && extra.description) return 1;
    return 0;
  };

  const getStatusBadgeCountStyle = (product: any): Record<string, string> => {
    const s = getEffectiveStatus(product);
    if (s === 'archived' || s === 'autoArchived') return { backgroundColor: '#ddd6fe', color: '#7c3aed' };
    if (getProductErrorList(product).length > 0) return { backgroundColor: '#fee2e2', color: '#dc2626' };
    if (getProductWarningList(product).length > 0) return { backgroundColor: '#fff7ed', color: '#ea580c' };
    if (s === 'error') return { backgroundColor: '#fee2e2', color: '#dc2626' };
    return { backgroundColor: '#e2e8f0', color: '#475569' };
  };

  const getUnlistedReason = (product: any): string => {
    const data = getProductRawData(product);
    if (!data?.statuses) return '';
    const statusFailed = Array.isArray(data.statuses) ? data.statuses[0].status_failed : data.statuses.status_failed;
    if (!statusFailed || statusFailed === 'none') return '';
    return translateStatusFailed(statusFailed);
  };

  const getStatusStateInfoList = (product: any): string[] => {
    const extra = getStatusExtraInfo(product);
    const items: string[] = [];
    const description = translateStatusDescription(extra.description);
    const tooltip = translateStatusDescription(extra.tooltip);
    if (description) items.push(description);
    if (tooltip && normalizeTranslationKey(tooltip) !== normalizeTranslationKey(description)) {
      items.push(tooltip);
    }
    const reason = getUnlistedReason(product);
    if (reason && !items.some(item => normalizeTranslationKey(item) === normalizeTranslationKey(reason))) {
      items.push(reason);
    }
    return items;
  };

  const shouldShowIssueCode = (code: string): boolean => {
    if (!code) return false;
    return false;
  };

  const renderIssueItem = (issue: any, tone: 'error' | 'warning' = 'error'): string => {
    const formatted = buildProductIssueMessage(issue.raw || issue);
    const codeClass = tone === 'warning' ? 'text-yellow-300/70' : 'text-red-300/70';
    const detail = formatted.detail ? `<div class="text-white/70 text-xs mt-1">${escapeHtml(formatted.detail)}</div>` : '';
    const code = shouldShowIssueCode(formatted.code) ? `<div class="${codeClass} text-xs mt-1 break-all">${escapeHtml(formatted.code)}</div>` : '';
    return `<div class="mb-2"><div class="text-white">${escapeHtml(formatted.message)}</div>${detail}${code}</div>`;
  };

  const renderStatusInfoBlock = (items: string[]): string => {
    if (items.length === 0) return '';
    return '<div class="font-medium mb-1 text-slate-100">状态信息</div>' +
      items.map(item => `<div class="text-white/80 text-xs mb-1">${escapeHtml(item)}</div>`).join('');
  };

  const joinTooltipSections = (sections: string[]): string => {
    return sections.filter(Boolean).join('<div class="border-t border-white/10 my-2"></div>');
  };

  const getStatusTooltip = (product: any): string => {
    const s = getEffectiveStatus(product);
    if (s === 'autoArchived') return '我们自动隐藏了该商品，因为它不符合绩效标准';
    if (s === 'archived') return '商品已被隐藏，买家看到它的状态为"无现货"';
    const productErrors = getProductErrorList(product);
    const productWarnings = getProductWarningList(product);
    const statusBlock = renderStatusInfoBlock(getStatusStateInfoList(product));
    const errorBlock = productErrors.length > 0
      ? '<div class="font-medium mb-1 text-red-300">卡片中有错误</div>' + productErrors.map(e => renderIssueItem(e, 'error')).join('')
      : '';
    const warningBlock = productWarnings.length > 0
      ? '<div class="font-medium mb-1 text-yellow-300">注意事项</div>' + productWarnings.map(w => renderIssueItem(w, 'warning')).join('')
      : '';
    return joinTooltipSections([statusBlock, errorBlock, warningBlock]);
  };

  const hasStatusTooltip = (product: any): boolean => getStatusTooltip(product).trim().length > 0;

  const getTooltipPlacement = (product: any): Placement => {
    const s = getEffectiveStatus(product);
    if (s === 'archived' || s === 'autoArchived') return 'left';
    return 'right';
  };

  const collectTranslationCandidate = (
    map: Map<string, TranslationItem>,
    code?: string,
    message?: string,
    level?: string
  ) => {
    const cleanCode = String(code || '').trim();
    const cleanMessage = String(message || '').trim();
    if (!cleanCode && !cleanMessage) return;
    if (cleanMessage && isLikelyChineseText(cleanMessage)) return;
    if (getStoredTranslation(cleanCode, cleanMessage)) return;
    const key = normalizeTranslationKey(cleanCode || `TEXT:${cleanMessage}`);
    if (!key || map.has(key)) return;
    map.set(key, { code: cleanCode, message: cleanMessage, level });
  };

  const collectVisibleOzonTranslationItems = (): TranslationItem[] => {
    const candidates = new Map<string, TranslationItem>();
    for (const item of options.products.value) {
      const data = getProductRawData(item);
      if (!data) continue;
      const errors = Array.isArray(data.errors) ? data.errors : [];
      for (const error of errors) {
        const level = error.level || error.texts?.level || 'ERROR_LEVEL_ERROR';
        const code = error.code || error.texts?.code || '';
        const message = error.message || error.texts?.message || '';
        collectTranslationCandidate(candidates, code, message, level);
      }
      const statuses = data.statuses ? (Array.isArray(data.statuses) ? data.statuses : [data.statuses]) : [];
      for (const status of statuses) {
        collectTranslationCandidate(candidates, `STATUS_NAME:${status?.status_name || ''}`, status?.status_name || '', 'STATUS_INFO');
        collectTranslationCandidate(candidates, `STATUS_DESCRIPTION:${status?.status_description || ''}`, status?.status_description || '', 'STATUS_INFO');
        collectTranslationCandidate(candidates, `STATUS_TOOLTIP:${status?.status_tooltip || ''}`, status?.status_tooltip || '', 'STATUS_INFO');
        collectTranslationCandidate(candidates, `STATUS_FAILED:${status?.status_failed || ''}`, status?.status_failed || '', 'STATUS_WARNING');
      }
    }
    return Array.from(candidates.values()).slice(0, 80);
  };

  const translateVisibleOzonMessages = async () => {
    if (translatingErrorMessages.value) return;
    const items = collectVisibleOzonTranslationItems();
    if (items.length === 0) return;
    translatingErrorMessages.value = true;
    try {
      const response = await options.translateErrors(items);
      if (response.success && response.data) {
        upsertLoadedTranslations(response.data);
      }
    } catch {
    } finally {
      translatingErrorMessages.value = false;
    }
  };

  return {
    getEffectiveStatus,
    getStatusBadgeStyle,
    getStatusLabel,
    getStatusSubtitle,
    getStatusBadgeCount,
    getStatusBadgeCountStyle,
    getStatusTooltip,
    hasStatusTooltip,
    getTooltipPlacement,
    loadStoredTranslations,
    translateVisibleOzonMessages,
  };
};
