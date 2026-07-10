import { ref } from 'vue';
import { ozonStoreAPI } from '@/api/ozonStoreAPI';
import type { OzonStore, OzonStoreContext } from '@/types';

const storeContext = ref<OzonStoreContext | null>(null);
const loadingStoreContext = ref(false);
let storeContextRequest: Promise<OzonStoreContext> | null = null;

const normalizeContext = (context?: OzonStoreContext | null): OzonStoreContext => ({
  currentOzonStoreId: context?.currentOzonStoreId ?? null,
  resolvedStoreId: context?.resolvedStoreId ?? context?.currentOzonStoreId ?? null,
  store: context?.store ?? null,
});

export function useOzonStoreContext() {
  const loadStoreContext = async (force = false) => {
    if (storeContextRequest) {
      return storeContextRequest;
    }

    if (!force && storeContext.value) {
      return storeContext.value;
    }

    loadingStoreContext.value = true;
    storeContextRequest = (async () => {
      const response = await ozonStoreAPI.getStoreContext();
      storeContext.value = normalizeContext(response.success ? response.data : null);
      return storeContext.value;
    })();

    try {
      return await storeContextRequest;
    } finally {
      loadingStoreContext.value = false;
      storeContextRequest = null;
    }
  };

  const applyStoreContext = (context?: OzonStoreContext | null) => {
    storeContext.value = normalizeContext(context);
    return storeContext.value;
  };

  const store = (): OzonStore | null => storeContext.value?.store ?? null;
  const storeId = (): number | null => storeContext.value?.resolvedStoreId ?? null;

  return {
    storeContext,
    loadingStoreContext,
    loadStoreContext,
    applyStoreContext,
    store,
    storeId,
  };
}
