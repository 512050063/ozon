import { nextTick, ref, type Ref } from 'vue';

interface TranslationResponse {
  success: boolean;
  data?: {
    items?: Array<{
      sourceText?: string;
      translatedText?: string;
      status?: string;
    }>;
    translationConfigured?: boolean;
    quotaExceeded?: boolean;
  };
}

interface Options {
  products: Ref<any[]>;
  resolveTranslations: (names: string[]) => Promise<TranslationResponse>;
  onTranslationNotConfigured?: () => void;
  onQuotaExceeded?: () => void;
}

export function useProductNameTranslations(options: Options) {
  const translationWarningShown = ref(false);
  const quotaWarningShown = ref(false);
  const pendingTranslations = new Set<string>();
  const resolvedTranslations = new Map<string, string>();
  const productNameElements = new Map<string, HTMLElement>();
  const overflowingProductNameKeys = ref<Set<string>>(new Set());

  const normalizeProductNameTranslationKey = (value: any): string => String(value || '').replace(/\s+/g, ' ').trim();

  const getProductNameKey = (product: any): string => String(
    product?.id ||
    product?.productId ||
    product?.ozonProductId ||
    product?.product?.ozonProductId ||
    product?.name ||
    ''
  );

  const getProductDisplayName = (product: any): string => {
    return normalizeProductNameTranslationKey(product?.nameZh || product?.name) || '未命名';
  };

  const refreshProductNameOverflowStates = async () => {
    await nextTick();
    const nextOverflowKeys = new Set<string>();
    for (const [key, element] of productNameElements.entries()) {
      if (!element.isConnected) {
        productNameElements.delete(key);
        continue;
      }
      if (element.scrollWidth > element.clientWidth + 1) {
        nextOverflowKeys.add(key);
      }
    }
    overflowingProductNameKeys.value = nextOverflowKeys;
  };

  const setProductNameElement = (product: any, element: Element | null) => {
    const key = getProductNameKey(product);
    if (!key) return;
    if (element instanceof HTMLElement) {
      productNameElements.set(key, element);
    } else {
      productNameElements.delete(key);
    }
  };

  const isProductNameOverflowing = (product: any): boolean => {
    const key = getProductNameKey(product);
    return Boolean(key && overflowingProductNameKeys.value.has(key));
  };

  const handleProductNameResize = () => {
    void refreshProductNameOverflowStates();
  };

  const shouldTranslateProductName = (product: any): boolean => {
    const name = normalizeProductNameTranslationKey(product?.name);
    if (!name || product?.nameZh) return false;
    if (/[\u3400-\u9fff]/.test(name)) return false;
    if (resolvedTranslations.has(name)) return false;
    if (pendingTranslations.has(name)) return false;
    return true;
  };

  const mergeProductNameTranslations = (items: any[]) => {
    const translationMap = new Map<string, string>();
    for (const item of items || []) {
      const sourceText = normalizeProductNameTranslationKey(item?.sourceText);
      const translatedText = normalizeProductNameTranslationKey(item?.translatedText);
      if (!sourceText || !translatedText) continue;
      if (item.status !== 'cached' && item.status !== 'translated') continue;
      translationMap.set(sourceText, translatedText);
      resolvedTranslations.set(sourceText, translatedText);
    }

    if (translationMap.size === 0) return;

    options.products.value = options.products.value.map(product => {
      const name = normalizeProductNameTranslationKey(product?.name);
      const translatedText = translationMap.get(name);
      if (!translatedText || product.nameZh) return product;
      return {
        ...product,
        nameZh: translatedText,
      };
    });
    void refreshProductNameOverflowStates();
  };

  const applyCachedProductNameTranslations = () => {
    let changed = false;
    options.products.value = options.products.value.map(product => {
      const name = normalizeProductNameTranslationKey(product?.name);
      const translatedText = resolvedTranslations.get(name);
      if (!translatedText || product.nameZh) return product;
      changed = true;
      return {
        ...product,
        nameZh: translatedText,
      };
    });
    if (changed) void refreshProductNameOverflowStates();
  };

  const resolveVisibleProductNameTranslations = async () => {
    applyCachedProductNameTranslations();

    const names = Array.from(new Set(
      options.products.value
        .filter(shouldTranslateProductName)
        .map(product => normalizeProductNameTranslationKey(product.name))
        .filter(Boolean)
    ));

    if (names.length === 0) {
      return;
    }

    names.forEach(name => pendingTranslations.add(name));

    try {
      const response = await options.resolveTranslations(names);
      if (!response.success || !response.data) return;

      mergeProductNameTranslations(response.data.items || []);

      if (response.data.translationConfigured === false && !translationWarningShown.value) {
        translationWarningShown.value = true;
        options.onTranslationNotConfigured?.();
      }

      if (response.data.quotaExceeded && !quotaWarningShown.value) {
        quotaWarningShown.value = true;
        options.onQuotaExceeded?.();
      }
    } catch {
    } finally {
      names.forEach(name => pendingTranslations.delete(name));
    }
  };

  return {
    getProductDisplayName,
    isProductNameOverflowing,
    setProductNameElement,
    refreshProductNameOverflowStates,
    handleProductNameResize,
    resolveVisibleProductNameTranslations,
  };
}
