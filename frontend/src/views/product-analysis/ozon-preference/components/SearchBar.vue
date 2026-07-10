<template>
  <div class="search-bar-container py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <!-- 类别选择文本框 -->
        <el-input
          v-model="categoryText"
          placeholder="选择类别"
          readonly
          class="input-category"
          @click="openCategoryDialog"
        >
          <template #prefix>
            <el-icon><List /></el-icon>
          </template>
        </el-input>

        <!-- 搜索框 -->
        <div class="search-container">
          <el-input
            v-model="searchKeyword"
            placeholder="输入关键字搜索..."
            clearable
            class="input-search"
            @keyup.enter="handleSearch"
          />
          <el-button type="primary" class="btn-search" @click="handleSearch">
            <el-icon class="mr-1"><Search /></el-icon>
            搜索
          </el-button>
        </div>
      </div>

      <!-- 更新按钮 -->
      <AppUpdateButton
        text="类目更新"
        :loading="isUpdatingCategory"
        :last-update-time="lastUpdateTime"
        :update-status="updateStatus === '更新成功' ? 'success' : updateStatus === '更新失败' ? 'error' : 'idle'"
        :fetch-last-update-time="fetchLastUpdateTime"
        @click="handleUpdateClick"
      />
    </div>

    <!-- 分类选择弹窗 -->
    <CategorySelectDialog 
      v-model="categoryDialogVisible" 
      :load-tree-data="getCategoryTreeData" 
      title="选择商品类型"
      @select="handleCategorySelect" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search, List } from '@element-plus/icons-vue';
// AppInput 已移除，使用全局CSS样式
import CategorySelectDialog from '@/components/ui/CategorySelectDialog.vue';
import AppUpdateButton from '@/components/ui/AppUpdateButton.vue';
import ozonCategoriesRaw from '@/assets/ozonCategories.json';
import { getOzonCategoryCreatedTime } from '@/api/ozonCategoryAPI';

// Ozon 类目数据
interface OzonType { type_id: number; type_name: string; disabled: boolean }
interface OzonSubCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonType[] }
interface OzonTopCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonSubCat[] }
const ozonCategories = (ozonCategoriesRaw as any).result as OzonTopCat[];

// 类目树节点类型
interface TreeNode {
  id: string
  label: string
  typeId?: number
  topCatId: number
  subCatId?: number
  children: TreeNode[]
}

// 构建 el-tree 数据
function buildCategoryTree(cats: OzonTopCat[]): TreeNode[] {
  if (!cats || cats.length === 0) return [];
  return cats.filter(c => !c.disabled).map(top => ({
    id: `top-${top.description_category_id}`,
    label: top.category_name,
    topCatId: top.description_category_id,
    children: top.children.filter(s => !s.disabled).map(sub => ({
      id: sub.description_category_id != null ? `sub-${sub.description_category_id}` : `sub-${Math.random().toString(36).slice(2)}`,
      label: sub.category_name,
      topCatId: top.description_category_id,
      subCatId: sub.description_category_id,
      children: sub.children.filter(t => !t.disabled).map(t => ({
        id: `type-${t.type_id}`,
        label: t.type_name,
        typeId: t.type_id,
        topCatId: top.description_category_id,
        subCatId: sub.description_category_id,
        children: []
      }))
    }))
  }));
}

interface Props {
  categories: any[];
  isLoading: boolean;
  isUpdatingCategory: boolean;
  initialKeyword?: string;
  initialCategoryPath?: number[];
}

const props = withDefaults(defineProps<Props>(), {
  categories: () => [],
  isLoading: false,
  isUpdatingCategory: false,
  initialKeyword: '',
  initialCategoryPath: () => [],
});

const emit = defineEmits<{
  search: [keyword: string, subCategory: string];
  updateCategories: [];
  categorySelect: [path: number[], categoryName: string, subCategory: string];
  keywordChange: [keyword: string];
  categoryPathChange: [path: number[]];
}>();

const searchKeyword = ref(props.initialKeyword);
const selectedCategoryPath = ref<number[]>(props.initialCategoryPath);
const selectedSubCategory = ref('');
const selectedCategoryName = ref('');

// AppUpdateButton 需要的状态（用于悬浮提示显示）
const lastUpdateTime = ref<Date | null>(null);
const updateStatus = ref('');

// 分类选择弹窗
const categoryDialogVisible = ref(false);
const categoryText = ref('');
const selectedTypeId = ref(0);

let cachedCategoryTreeData: TreeNode[] | null = null;
const getCategoryTreeData = () => {
  if (!cachedCategoryTreeData) {
    cachedCategoryTreeData = buildCategoryTree(ozonCategories);
  }
  return cachedCategoryTreeData;
};

watch(() => props.initialKeyword, (val) => { searchKeyword.value = val; });
watch(() => props.initialCategoryPath, (val) => { selectedCategoryPath.value = val; });

// 清空搜索框时同步清空下拉框
watch(() => searchKeyword.value, (val) => {
  if (!val) {
    selectedCategoryPath.value = [];
    selectedCategoryName.value = '';
    selectedSubCategory.value = '';
    categoryText.value = '';
    emit('categorySelect', [], '', '');
    emit('categoryPathChange', []);
  }
});

// 打开分类选择弹窗
const openCategoryDialog = () => {
  categoryDialogVisible.value = true;
};

// 处理分类选择
const handleCategorySelect = (data: { topCatId: number; subCatId: number; typeId: number; fullPath: string }) => {
  categoryText.value = data.fullPath;
  selectedTypeId.value = data.typeId;
  selectedCategoryName.value = data.fullPath;
  selectedSubCategory.value = data.fullPath.split(' > ').pop() || '';
  
  // 构建路径数组
  selectedCategoryPath.value = [data.topCatId, data.subCatId, data.typeId].filter(id => id > 0);
  
  emit('categorySelect', selectedCategoryPath.value, selectedCategoryName.value, selectedSubCategory.value);
  emit('categoryPathChange', selectedCategoryPath.value);
};

const handleSearch = () => {
  const keyword = searchKeyword.value.trim();
  const subCategory = selectedSubCategory.value.trim();
  emit('keywordChange', keyword);
  emit('search', keyword, subCategory);
};

// 获取最新更新时间
const fetchLastUpdateTime = async (): Promise<{ lastUpdateTime: string | Date; status: 'idle' | 'success' | 'error' }> => {
  try {
    const response = await getOzonCategoryCreatedTime();
    if (response.data) {
      lastUpdateTime.value = new Date(response.data);
      updateStatus.value = 'success';
    }
    const status: 'idle' | 'success' | 'error' = lastUpdateTime.value ? 'success' : 'idle';
    return {
      lastUpdateTime: lastUpdateTime.value || '',
      status
    };
  } catch {
    return { lastUpdateTime: '', status: 'idle' };
  }
};

// 更新按钮点击处理
const handleUpdateClick = () => {
  handleUpdateCategories();
};

const handleUpdateCategories = () => { emit('updateCategories'); };
</script>

<style scoped>
/* 搜索栏容器 */
.search-bar-container {
  padding: 8px 0;
}
</style>
