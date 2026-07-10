<template>
  <el-drawer
    v-model="drawerVisible"
    direction="rtl"
    size="60%"
    :with-header="true"
    :show-close="false"
  >
    <template #header>
      <div class="app-surface-header app-surface-header--drawer">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-lg"><Document /></el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <span class="app-surface-title">活动详情</span>
          <span class="app-surface-subtitle" :title="title">{{ title || '促销活动说明' }}</span>
        </div>
      </div>
    </template>

    <div v-if="promotion" class="app-drawer-content app-drawer-sections">
      <div class="bg-slate-50 rounded-lg p-4">
        <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
          <span class="w-1 h-4 bg-blue-500 rounded mr-2"></span>
          活动基础信息
        </h4>
        <div class="grid grid-cols-2 gap-x-10 gap-y-3">
          <div v-for="item in baseInfoRows" :key="item.label" class="flex items-center justify-between min-w-0 gap-4">
            <span class="text-xs text-slate-500 flex-shrink-0">{{ item.label }}</span>
            <el-tag v-if="item.tagType" class="app-table-tag" size="small" :type="item.tagType" effect="plain">{{ item.value }}</el-tag>
            <span v-else class="text-xs text-slate-900 truncate ml-2" :title="item.value">{{ item.value }}</span>
          </div>
        </div>
      </div>

      <template v-if="contentSections.length">
        <div
          v-for="(section, sectionIndex) in contentSections"
          :key="`${section.title}-${sectionIndex}`"
          class="bg-slate-50 rounded-lg p-4"
        >
          <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-5">
            <span :class="['w-1 h-4 rounded mr-2', sectionIndex % 2 ? 'bg-violet-500' : 'bg-blue-500']"></span>
            {{ section.title }}
          </h4>
          <div class="promotion-detail-text-list space-y-2">
            <div
              v-for="(block, blockIndex) in section.blocks"
              :key="`${block.type}-${blockIndex}-${block.text}`"
              :class="[
                'promotion-description-content',
                `promotion-description-content--${block.type}`,
                { 'is-indented': block.indent > 0 },
              ]"
            >
              <span v-if="block.type === 'bullet'" class="promotion-description-bullet">•</span>
              <span>{{ block.text }}</span>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="bg-slate-50 rounded-lg p-4">
        <p class="promotion-description-empty">暂无活动说明。</p>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { Document } from '@element-plus/icons-vue';
import type { OzonPromotion } from '@/api/ozonPromotionAPI';
import { usePromotionTextTranslations } from '@/composables/usePromotionTextTranslations';

type DescriptionBlock = {
  text: string;
  type: 'title' | 'subtitle' | 'heading' | 'paragraph' | 'bullet';
  indent: number;
};

type DescriptionSection = {
  title: string;
  blocks: DescriptionBlock[];
};

type BaseInfoRow = {
  label: string;
  value: string;
  tagType?: 'primary' | 'success' | 'info' | 'warning' | 'danger';
};

const props = defineProps<{
  visible: boolean;
  promotion: OzonPromotion | null;
  title?: string;
  description?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const { getPromotionTranslatedText, resolveVisiblePromotionTextTranslations } = usePromotionTextTranslations();

const drawerVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
});

const PROMOTION_ACTION_TYPE_LABELS: Record<string, string> = {
  ELASTIC_BOOSTING: '弹性提升',
  STOCK_DISCOUNT: '库存折扣',
};

const getRawValue = (keys: string[]) => {
  const row = props.promotion as any;
  for (const key of keys) {
    const value = row?.[key] ?? row?.raw?.[key] ?? row?.result?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const getRawRowValue = (row: OzonPromotion, keys: string[]) => {
  const source = row as any;
  for (const key of keys) {
    const value = source?.[key] ?? source?.raw?.[key] ?? source?.result?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const typeLabel = computed(() => {
  const actionType = String(props.promotion?.action_type || '').trim();
  return PROMOTION_ACTION_TYPE_LABELS[actionType] || actionType || '促销活动';
});

const participationLabel = computed(() => props.promotion?.is_participating ? '我正在参与' : '未参与');
const participationTagType = computed(() => props.promotion?.is_participating ? 'success' : 'info');

const autoAddEnabled = computed(() => {
  const autoAddDates = getRawValue(['auto_add_dates', 'autoAddDates']);
  if (Array.isArray(autoAddDates) && autoAddDates.length > 0) return true;
  const value = getRawValue([
    'is_auto_add',
    'isAutoAdd',
    'auto_add',
    'autoAdd',
    'auto_added',
    'autoAdded',
    'with_auto_add',
    'withAutoAdd',
    'is_auto_add_enabled',
    'isAutoAddEnabled',
  ]);
  return value === true || value === 1 || value === '1' || value === 'true';
});

const autoAddLabel = computed(() => autoAddEnabled.value ? '已自动添加' : '未自动添加');
const autoAddTagType = computed(() => autoAddEnabled.value ? 'warning' : 'info');

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatDateRange = (row: OzonPromotion) => {
  return `${formatDate(row.date_start)} - ${formatDate(row.date_end)}`;
};

const formatOzonEnglishDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const getSortedAutoAddDates = (row: OzonPromotion) => {
  const autoAddDates = getRawRowValue(row, ['auto_add_dates', 'autoAddDates']);
  if (!Array.isArray(autoAddDates)) return [];
  return autoAddDates
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
};

const getNextAutoAddDate = (row: OzonPromotion) => {
  const dates = getSortedAutoAddDates(row);
  if (dates.length === 0) return '';
  const now = Date.now();
  return dates.find(value => {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) && timestamp >= now;
  }) || dates[dates.length - 1];
};

const getPromotionAddPlanText = (row: OzonPromotion) => {
  const nextAutoAddDate = getNextAutoAddDate(row);
  if (!nextAutoAddDate) return '请添加商品';
  return `将自动添加商品 从${formatOzonEnglishDate(nextAutoAddDate)}`;
};

const baseInfoRows = computed<BaseInfoRow[]>(() => {
  const row = props.promotion;
  if (!row) return [];
  return [
    { label: '活动名称', value: descriptionView.value.title || props.title || '-' },
    { label: '活动时间', value: formatDateRange(row) },
    { label: '活动类型', value: typeLabel.value, tagType: 'primary' },
    { label: '状态', value: participationLabel.value, tagType: participationTagType.value },
    { label: '是否自动添加', value: autoAddLabel.value, tagType: autoAddTagType.value },
    { label: '将自动添加商品', value: getPromotionAddPlanText(row) },
    { label: '可添加商品', value: String(row.potential_products_count ?? 0) },
    { label: '已参与商品', value: String(row.participating_products_count ?? 0) },
  ];
});

const decodeHtmlEntities = (value: string) => {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

const stripHtml = (value: string) => {
  return decodeHtmlEntities(value)
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const getRawDescriptionHtml = () => {
  const row = props.promotion as any;
  return String(row?.description || row?.raw?.description || props.description || '').trim();
};

const splitDescriptionHtml = (html: string) => {
  if (!html) return [];
  return decodeHtmlEntities(html)
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
};

const normalizeLine = (line: string) => {
  return stripHtml(line)
    .replace(/^[\t ]+/, '')
    .replace(/\s+([,.!?;:，。！？；：])/g, '$1')
    .trim();
};

const isBoldLine = (line: string) => /<b\b[^>]*>/i.test(line) || /<strong\b[^>]*>/i.test(line);

const resolveBlockType = (line: string, text: string, index: number): DescriptionBlock['type'] => {
  if (/^[•\-–]\s*/.test(text)) return 'bullet';
  if (index === 0) return 'title';
  if (isBoldLine(line) && /[:：]$/.test(text)) return 'heading';
  if (isBoldLine(line)) return 'subtitle';
  return 'paragraph';
};

const normalizeBlockText = (text: string, type: DescriptionBlock['type']) => {
  if (type === 'bullet') return text.replace(/^[•\-–]\s*/, '').trim();
  return text;
};

const rawDescriptionBlocks = computed<DescriptionBlock[]>(() => {
  const lines = splitDescriptionHtml(getRawDescriptionHtml());
  return lines.map((line, index) => {
    const normalizedText = normalizeLine(line);
    const type = resolveBlockType(line, normalizedText, index);
    return {
      text: normalizeBlockText(normalizedText, type),
      type,
      indent: type === 'bullet' ? 1 : 0,
    };
  }).filter(block => block.text);
});

const descriptionBlocks = computed<DescriptionBlock[]>(() => {
  if (rawDescriptionBlocks.value.length === 0 && props.description) {
    return [{
      text: props.description,
      type: 'paragraph',
      indent: 0,
    }];
  }
  return rawDescriptionBlocks.value.map(block => ({
    ...block,
    text: getPromotionTranslatedText(block.text),
  }));
});

const descriptionView = computed(() => {
  const blocks = descriptionBlocks.value;
  const firstTitle = blocks.find(block => block.type === 'title');
  const sections: DescriptionSection[] = [];
  let currentSection: DescriptionSection | null = null;

  const ensureSection = () => {
    if (!currentSection) {
      currentSection = { title: '', blocks: [] };
      sections.push(currentSection);
    }
    return currentSection;
  };

  for (const block of blocks) {
    if (block.type === 'title') continue;

    if (block.type === 'subtitle' || block.type === 'heading') {
      currentSection = { title: block.text, blocks: [] };
      sections.push(currentSection);
      continue;
    }

    ensureSection().blocks.push(block);
  }

  return {
    title: firstTitle?.text || '',
    sections: sections.filter(section => section.title || section.blocks.length > 0),
  };
});

const normalizeSectionTitle = (value: string) => {
  const text = String(value || '').trim();
  if (!text) return '活动说明';
  if (/日期|date/i.test(text)) return '活动说明';
  if (/机械师|机制|механ/i.test(text)) return '机制';
  if (/获得|получ/i.test(text)) return '参与活动商品将获得';
  if (/条件|услов/i.test(text)) return '参与条件';
  return text.replace(/[：:]\s*$/, '');
};

const contentSections = computed<DescriptionSection[]>(() => {
  return descriptionView.value.sections.map(section => {
    const sectionTitle = normalizeSectionTitle(section.title);
    const blocks = [...section.blocks];
    if (/日期|date/i.test(section.title)) {
      blocks.unshift({
        text: section.title,
        type: 'subtitle',
        indent: 0,
      });
    }
    return {
      title: sectionTitle,
      blocks,
    };
  }).filter(section => section.title || section.blocks.length > 0);
});

watch(
  () => [props.visible, props.promotion?.id, rawDescriptionBlocks.value.map(block => block.text).join('\n')],
  ([visible]) => {
    if (!visible) return;
    const texts = rawDescriptionBlocks.value.map(block => block.text).filter(Boolean);
    if (texts.length > 0) {
      void resolveVisiblePromotionTextTranslations(texts);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.promotion-detail-text-list {
  color: #1f2937;
  font-size: 13px;
  line-height: 1.7;
}

.promotion-description-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.promotion-description-content--paragraph {
  color: #1f2937;
}

.promotion-description-content--subtitle {
  color: #111827;
  font-weight: 800;
}

.promotion-description-content--bullet {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 2px;
  color: #1f2937;
}

.promotion-description-content.is-indented {
  padding-left: 8px;
}

.promotion-description-bullet {
  flex: 0 0 auto;
  color: #0f172a;
  font-weight: 800;
  line-height: 1.6;
}

.promotion-description-empty {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}
</style>
