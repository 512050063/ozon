import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { ozonProductAPI } from '@/api/ozonProductAPI';

const resolvedPromotionTextTranslations = new Map<string, string>();
const pendingPromotionTextTranslations = new Set<string>();
const warningShown = ref(false);
const quotaWarningShown = ref(false);
const translationVersion = ref(0);

export const normalizePromotionTextTranslationKey = (value: any): string =>
  String(value || '').replace(/\s+/g, ' ').trim();

const isChineseText = (value: string): boolean => /[\u3400-\u9fff]/.test(value);

const applyPromotionTranslationCorrections = (sourceText: string, translatedText: string): string => {
  const source = normalizePromotionTextTranslationKey(sourceText).toLowerCase();
  let translated = normalizePromotionTextTranslationKey(translatedText);

  if (/эластичн/.test(source) && /бустинг/.test(source)) {
    translated = translated
      .replace(/弹性胸罩/g, '弹性提升')
      .replace(/弹性推进/g, '弹性提升')
      .replace(/弹性推升/g, '弹性提升');
  }

  return translated;
};

export function usePromotionTextTranslations() {
  const resolveVisiblePromotionTextTranslations = async (values: any[]) => {
    const texts = Array.from(new Set(
      values
        .map(normalizePromotionTextTranslationKey)
        .filter(text => text && !isChineseText(text))
        .filter(text => !resolvedPromotionTextTranslations.has(text))
        .filter(text => !pendingPromotionTextTranslations.has(text))
    ));

    if (texts.length === 0) return;

    texts.forEach(text => pendingPromotionTextTranslations.add(text));
    try {
      const response = await ozonProductAPI.resolveProductNameTranslations(texts);
      if (!response.success || !response.data) return;

      let changed = false;
      for (const item of response.data.items || []) {
        const sourceText = normalizePromotionTextTranslationKey(item?.sourceText);
        const translatedText = applyPromotionTranslationCorrections(sourceText, item?.translatedText);
        if (!sourceText || !translatedText) continue;
        if (item.status !== 'cached' && item.status !== 'translated') continue;
        if (resolvedPromotionTextTranslations.get(sourceText) === translatedText) continue;
        resolvedPromotionTextTranslations.set(sourceText, translatedText);
        changed = true;
      }

      if (changed) {
        translationVersion.value += 1;
      }

      if (response.data.translationConfigured === false && !warningShown.value) {
        warningShown.value = true;
        ElMessage.warning('未配置翻译 API，促销活动信息将暂时显示原文');
      }

      if (response.data.quotaExceeded && !quotaWarningShown.value) {
        quotaWarningShown.value = true;
        ElMessage.warning('本月翻译字符额度不足，未翻译的促销活动信息将暂时显示原文');
      }
    } catch {
    } finally {
      texts.forEach(text => pendingPromotionTextTranslations.delete(text));
    }
  };

  const getPromotionTranslatedText = (value: any): string => {
    void translationVersion.value;
    const text = normalizePromotionTextTranslationKey(value);
    return applyPromotionTranslationCorrections(text, resolvedPromotionTextTranslations.get(text) || text);
  };

  return {
    getPromotionTranslatedText,
    resolveVisiblePromotionTextTranslations,
  };
}
