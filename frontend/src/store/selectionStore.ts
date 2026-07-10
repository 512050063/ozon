import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CollectionItem } from '@/types/warehouse';
import type { ProductSelection } from '@/api/productSelectionAPI';
import { collectionAPI } from '@/api/collectionAPI';
import { productSelectionAPI } from '@/api/productSelectionAPI';

export const useSelectionStore = defineStore('selection', () => {
  // 采集库数据
  const collectionLibrary = ref<CollectionItem[]>([]);
  const collectionLoading = ref(false);
  const productLoading = ref(false);

  // 选品库数据（使用 ProductSelection 类型，与 API 返回一致）
  const productLibrary = ref<ProductSelection[]>([]);

  // 加载采集库数据
  const loadCollectionData = async () => {
    collectionLoading.value = true;
    try {
      const response = await collectionAPI.getCollectionItems();
      if (response.success && response.data) {
        collectionLibrary.value = response.data;
      }
    } catch {
    } finally {
      collectionLoading.value = false;
    }
  };

  // 加载选品库数据（仅从API读取正式数据）
  const loadProductData = async () => {
    productLoading.value = true;
    try {
      const response = await productSelectionAPI.getProductSelections();
      if (response.success && response.data) {
        productLibrary.value = Array.isArray(response.data.data) ? response.data.data : [];
      } else {
        productLibrary.value = [];
      }
    } catch {
      productLibrary.value = [];
    } finally {
      productLoading.value = false;
    }
  };

  // 初始化加载所有数据
  const initLoadData = async () => {
    await Promise.all([loadCollectionData(), loadProductData()]);
  };

  // 添加采集商品
  const addCollectionItem = async (item: Omit<CollectionItem, 'id' | 'isProcessed' | 'supplier'>) => {
    try {
      // 转换类型，将 ImageItem 转换为 imageUrl 字符串
      const requestData = {
        ...item,
        image: item.image?.fileUrl || item.image,
      };
      const response = await collectionAPI.createCollectionItem(requestData as any);
      if (response.success && response.data) {
        collectionLibrary.value.unshift(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  // 更新采集商品
  const updateCollectionItem = async (id: number, updates: Partial<CollectionItem>) => {
    try {
      // 转换类型，将 ImageItem 转换为 imageUrl 字符串
      const requestData = {
        ...updates,
        image: updates.image?.fileUrl || updates.image,
      };
      const response = await collectionAPI.updateCollectionItem(id, requestData as any);
      if (response.success && response.data) {
        const index = collectionLibrary.value.findIndex(item => item.id === id);
        if (index !== -1) {
          collectionLibrary.value[index] = response.data;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  // 删除采集商品
  const deleteCollectionItem = async (id: number) => {
    try {
      await collectionAPI.deleteCollectionItem(id);
      const index = collectionLibrary.value.findIndex(item => item.id === id);
      if (index !== -1) {
        collectionLibrary.value.splice(index, 1);
      }
      return true;
    } catch (error) {
      throw error;
    }
  };

  // 将采集商品入库到选品库
  const moveToProductLibrary = async (collectionItem: CollectionItem) => {
    try {
      const response = await collectionAPI.moveToProductLibrary(collectionItem.id);
      if (response.success && response.data) {
        // 标记为已处理
        const index = collectionLibrary.value.findIndex(item => item.id === collectionItem.id);
        if (index !== -1) {
          collectionLibrary.value[index] = response.data;
        }
        // 重新加载选品库数据
        await loadProductData();
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  };

  // 添加选品商品
  const addProductItem = async (item: Omit<ProductSelection, 'id'>) => {
    try {
      const response = await productSelectionAPI.createProductSelection(item);
      if (response.success && response.data) {
        productLibrary.value.unshift(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  // 更新选品商品
  const updateProductItem = async (id: number, updates: Partial<ProductSelection>) => {
    try {
      const response = await productSelectionAPI.updateProductSelection(id, updates);
      if (response.success && response.data) {
        const index = productLibrary.value.findIndex(item => item.id === id);
        if (index !== -1) {
          productLibrary.value[index] = response.data;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  // 删除选品商品
  const deleteProductItem = async (id: number) => {
    try {
      await productSelectionAPI.deleteProductSelection(id);
      const index = productLibrary.value.findIndex(item => item.id === id);
      if (index !== -1) {
        productLibrary.value.splice(index, 1);
      }
      return true;
    } catch (error) {
      throw error;
    }
  };

  return {
    // 状态
    collectionLibrary,
    productLibrary,
    collectionLoading,
    productLoading,

    // 方法
    initLoadData,
    loadCollectionData,
    loadProductData,
    addCollectionItem,
    updateCollectionItem,
    deleteCollectionItem,
    moveToProductLibrary,
    addProductItem,
    updateProductItem,
    deleteProductItem,
  };
});
