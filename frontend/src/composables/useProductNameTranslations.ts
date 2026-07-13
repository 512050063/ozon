import { ref } from 'vue';
import { ozonProductAPI } from '@/api/ozonProductAPI';
import { ElMessage } from 'element-plus';

const resolvedProductNameTranslations = new Map<string, string>();
const pendingProductNameTranslations = new Set<string>();
const quotaWarningShown = ref(false);
const translationVersion = ref(0);

export const normalizeProductNameTranslationKey = (value: any): string => String(value || '').replace(/\s+/g, ' ').trim();

const isChineseText = (value: string): boolean => /[\u3400-\u9fff]/.test(value);

export function useProductNameTranslations() {
  const resolveNames = async (values: any[]) => {
    const names = Array.from(new Set(
      values
        .map(normalizeProductNameTranslationKey)
        .filter(name => name && !isChineseText(name))
        .filter(name => !resolvedProductNameTranslations.has(name))
        .filter(name => !pendingProductNameTranslations.has(name))
    ));

    if (names.length === 0) return;

    names.forEach(name => pendingProductNameTranslations.add(name));
    try {
      const response = await ozonProductAPI.resolveProductNameTranslations(names);
      if (!response.success || !response.data) return;

      let changed = false;
      for (const item of response.data.items || []) {
        const sourceText = normalizeProductNameTranslationKey(item?.sourceText);
        const translatedText = normalizeProductNameTranslationKey(item?.translatedText);
        if (!sourceText || !translatedText) continue;
        if (item.status !== 'cached' && item.status !== 'translated') continue;
        if (resolvedProductNameTranslations.get(sourceText) === translatedText) continue;
        resolvedProductNameTranslations.set(sourceText, translatedText);
        changed = true;
      }
      if (changed) {
        translationVersion.value += 1;
      }

      if (response.data.quotaExceeded && !quotaWarningShown.value) {
        quotaWarningShown.value = true;
        ElMessage.warning('本月翻译字符额度不足，未翻译的商品名称将暂时显示原文');
      }
    } catch {
    } finally {
      names.forEach(name => pendingProductNameTranslations.delete(name));
    }
  };

  const getTranslatedName = (value: any): string => {
    void translationVersion.value;
    const name = normalizeProductNameTranslationKey(value);
    return resolvedProductNameTranslations.get(name) || name;
  };

  return {
    getTranslatedName,
    resolveNames,
  };
}
