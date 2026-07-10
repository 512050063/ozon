<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <Transition name="fade">
      <div
        v-if="dialogVisible"
        class="cat-dialog-overlay"
        @click.self="handleClose"
      >
        <!-- 弹窗内容 -->
        <Transition name="scale">
          <div v-if="dialogVisible" class="cat-dialog-content">
            <!-- 自定义页头 -->
            <div class="cat-dialog-header app-surface-header">
              <div class="dialog-icon-wrapper app-surface-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                </svg>
              </div>
              <div class="dialog-title-wrapper app-surface-title-wrapper">
                <h3 class="dialog-title app-surface-title">{{ title || '选择商品类型' }}</h3>
                <p class="dialog-subtitle app-surface-subtitle">选择商品所属的类目类型</p>
              </div>
            </div>

            <!-- 搜索框 -->
            <div class="cat-search-bar">
              <el-input 
                v-model="searchText" 
                placeholder="搜索类目名称..." 
                size="default" 
                clearable 
                class="input-search category-search-input"
              />
            </div>

            <!-- 类目树容器 -->
            <div class="cat-tree-container">
              <!-- 树形选择器 -->
              <div v-if="treeReady" class="cat-tree-wrap">
                <el-tree
                  ref="treeRef"
                  :data="displayTreeData"
                  :props="{ label: 'label', children: 'children' }"
                  node-key="id"
                  :filter-node-method="filterNode"
                  :default-expand-all="false"
                  :default-expanded-keys="defaultExpandedKeys"
                  :default-checked-keys="defaultCheckedKeys"
                  highlight-current
                  :indent="16"
                  class="category-tree"
                  @node-click="handleNodeClick"
                >
                  <template #empty>
                    <div class="empty-tree">
                      <span class="empty-text">类目不存在</span>
                    </div>
                  </template>
                </el-tree>
              </div>
              <!-- 加载状态：覆盖到树完成挂载后再消失，避免中间空白 -->
              <Transition name="tree-loading-fade">
                <div v-if="treeLoading" class="tree-loading-wrap">
                  <AppSkeletonLoader variant="dialog" :rows="4" compact />
                </div>
              </Transition>
            </div>

            <!-- 已选路径（放在类目树外面） -->
            <div class="cat-selected-path-wrap">
              <span class="path-label">已选：</span>
              <span class="path-value">{{ selectedPath || '未选择' }}</span>
              <button v-if="selectedId" class="path-clear" @click="clearSelection">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- 弹窗底部 -->
            <div class="cat-dialog-footer">
              <button class="btn-cancel" @click="handleClose">取消</button>
              <button class="btn-confirm" :disabled="!selectedId" @click="handleConfirm">确认</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import AppSkeletonLoader from './AppSkeletonLoader.vue';

// Props
interface Props {
  modelValue: boolean;
  treeData?: any[] | null;
  loadTreeData?: () => any[] | Promise<any[]>;
  loadingDelayMs?: number;
  initialSearchText?: string;
  initialSelectedId?: number | null;
  initialSelectedPath?: string;
  title?: string;
  // 初始选中的路径（topCatId, subCatId, typeId）用于展开树
  initialCascaderValue?: number[];
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  treeData: null,
  loadingDelayMs: 160,
  initialSearchText: '',
  initialSelectedId: null,
  initialSelectedPath: '',
  title: '选择商品类型',
  initialCascaderValue: () => [],
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [id: number, path: string];
  select: [data: { topCatId: number; subCatId: number; typeId: number; fullPath: string }];
  searchChange: [text: string];
}>();

// v-model 桥接
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});

// 内部状态
const searchText = ref(props.initialSearchText);
const selectedId = ref<number | null>(props.initialSelectedId);
const selectedPath = ref(props.initialSelectedPath);
const selectedTopCatId = ref(props.initialCascaderValue[0] || 0);
const selectedSubCatId = ref(props.initialCascaderValue[1] || 0);
const treeRef = ref<any>(null);
const displayTreeData = ref<any[] | null>(null);
const treeLoading = ref(false);
const treeReady = computed(() => Array.isArray(displayTreeData.value));
let filterTimer: number | null = null;
let treeLoadToken = 0;

const deferToNextPaint = () => new Promise<void>(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});
const delay = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

// 默认展开的节点key
const defaultExpandedKeys = computed(() => {
  const keys: string[] = [];
  const [topCatId, subCatId] = props.initialCascaderValue;
  if (topCatId) {
    keys.push(`top-${topCatId}`);
    if (subCatId) {
      keys.push(subCatId != null ? `sub-${subCatId}` : `sub-${topCatId}-default`);
    }
  }
  return keys;
});

// 默认选中的节点key
const defaultCheckedKeys = computed(() => {
  const [, , typeId] = props.initialCascaderValue;
  if (typeId) {
    return [`type-${typeId}`];
  }
  return [];
});

const clearFilterTimer = () => {
  if (filterTimer === null) return;
  window.clearTimeout(filterTimer);
  filterTimer = null;
};

const applyTreeFilter = (value: string) => {
  if (!treeReady.value) return;
  treeRef.value?.filter(value);
  emit('searchChange', value);
};

const scheduleTreeFilter = (value: string, delayMs = 80) => {
  clearFilterTimer();
  filterTimer = window.setTimeout(() => {
    filterTimer = null;
    applyTreeFilter(value);
  }, delayMs);
};

const loadTreeForDialog = async () => {
  const token = ++treeLoadToken;
  displayTreeData.value = null;
  treeLoading.value = true;
  await deferToNextPaint();
  if (props.loadingDelayMs > 0) {
    await delay(props.loadingDelayMs);
  }
  if (!props.modelValue || token !== treeLoadToken) return;
  try {
    const treeData = props.loadTreeData ? await props.loadTreeData() : props.treeData;
    if (!props.modelValue || token !== treeLoadToken) return;
    displayTreeData.value = Array.isArray(treeData) ? treeData : [];
    await nextTick();
    await deferToNextPaint();
    if (!props.modelValue || token !== treeLoadToken) return;
    treeLoading.value = false;
  } catch {
    if (token === treeLoadToken) {
      displayTreeData.value = [];
      treeLoading.value = false;
    }
  }
};

const prepareDialogOpen = async () => {
  displayTreeData.value = null;
  treeLoading.value = true;
  await deferToNextPaint();
  await loadTreeForDialog();
};

// 监听搜索文本变化
watch(searchText, (val) => {
  scheduleTreeFilter(val);
});

// 弹窗打开时重置并展开选中项
watch(() => props.modelValue, (val) => {
  if (val) {
    searchText.value = props.initialSearchText || '';
    selectedId.value = props.initialSelectedId ?? null;
    selectedPath.value = props.initialSelectedPath || '';
    selectedTopCatId.value = props.initialCascaderValue[0] || 0;
    selectedSubCatId.value = props.initialCascaderValue[1] || 0;
    void prepareDialogOpen();
    
    window.setTimeout(() => {
      if (!treeReady.value) return;
      applyTreeFilter('');
      // 自动选中节点
      const [, , typeId] = props.initialCascaderValue;
      if (typeId && treeRef.value) {
        const nodeKey = `type-${typeId}`;
        treeRef.value.setCurrentKey(nodeKey);
      }
    }, 100);
  } else {
    treeLoadToken++;
    displayTreeData.value = null;
    treeLoading.value = false;
  }
});

watch(() => props.treeData, async (treeData) => {
  if (!props.modelValue || props.loadTreeData) return;
  if (Array.isArray(treeData)) {
    displayTreeData.value = treeData;
    await nextTick();
    await deferToNextPaint();
    treeLoading.value = false;
  }
});

watch(treeReady, (ready) => {
  if (!ready || !props.modelValue) return;
  window.setTimeout(() => {
    applyTreeFilter(searchText.value || '');
    const [, , typeId] = props.initialCascaderValue;
    if (typeId && treeRef.value) {
      treeRef.value.setCurrentKey(`type-${typeId}`);
    }
  }, 0);
});

onBeforeUnmount(() => {
  clearFilterTimer();
});

// 过滤节点方法
const filterNode = (value: string, data: any): boolean => {
  if (!value) return true;
  return data.label?.toLowerCase().includes(value.toLowerCase());
};

// 节点点击处理
const handleNodeClick = (data: any, node: any) => {
  if (data.typeId != null) {
    selectedId.value = data.typeId;
    selectedTopCatId.value = data.topCatId;
    selectedSubCatId.value = data.subCatId || 0;
    const pathParts: string[] = [];
    let cur = node;
    while (cur && cur.data && cur.data.label) {
      pathParts.unshift(cur.data.label);
      cur = cur.parent;
    }
    selectedPath.value = pathParts.join(' > ');
  }
};

// 清除选择
const clearSelection = () => {
  selectedId.value = null;
  selectedPath.value = '';
  selectedTopCatId.value = 0;
  selectedSubCatId.value = 0;
  treeRef.value?.setCurrentKey(null);
};

// 关闭弹窗
const handleClose = () => {
  dialogVisible.value = false;
};

// 确认选择
const handleConfirm = async () => {
  if (selectedId.value == null) return;
  const selectedPayload = {
    topCatId: selectedTopCatId.value,
    subCatId: selectedSubCatId.value,
    typeId: selectedId.value,
    fullPath: selectedPath.value,
  };
  const selectedPathValue = selectedPath.value;
  dialogVisible.value = false;
  await deferToNextPaint();
  emit('confirm', selectedPayload.typeId, selectedPathValue);
  emit('select', selectedPayload);
};
</script>

<style scoped>
/* 遮罩层 */
.cat-dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

/* 弹窗内容 */
.cat-dialog-content {
  background-color: #f8fafc;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  max-width: 480px;
  width: 100%;
  margin: 24px;
  overflow: hidden;
}

/* 弹窗头部 */
.cat-dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.78);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.72));
}

.dialog-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  margin-right: 0;
  border: 1px solid rgba(191, 219, 254, 0.86);
  border-radius: 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #2563eb;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 8px 18px rgba(37, 99, 235, 0.12);
}

.dialog-icon-wrapper svg {
  width: 24px;
  height: 24px;
}

.dialog-title-wrapper {
  flex: 1;
}

.dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
  line-height: 24px;
}

.dialog-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 18px;
}

/* 搜索框 */
.cat-search-bar {
  padding: 16px 28px;
}

.category-search-input {
  width: 100%;
  --el-input-bg-color: #ffffff;
  --el-input-border-color: #e2e8f0;
  --el-input-hover-border-color: #cbd5e1;
  --el-input-height: 38px;
  --el-input-border-radius: 10px;
}

.category-search-input :deep(.el-input__wrapper) {
  border-radius: 10px !important;
}

/* 类目树容器 */
.cat-tree-container {
  position: relative;
  margin: 0 28px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background-color: #ffffff;
  height: 240px;
}

/* 树形选择器容器 */
.cat-tree-wrap {
  position: relative;
  height: 100%;
  overflow-y: auto;
  padding: 8px;
}

/* 已选路径容器（放在类目树外面） */
.cat-selected-path-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  margin: 12px 28px;
  background: rgba(219, 234, 254, 0.5);
  border-radius: 8px;
  border: 1px solid #dbeafe;
}

.path-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.path-value {
  flex: 1;
  font-size: 13px;
  color: #1e40af;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s ease;
}

.path-clear:hover {
  background: #ffffff;
  color: #dc2626;
}

.path-clear svg {
  width: 12px;
  height: 12px;
}

/* 加载状态容器 */
.tree-loading-wrap {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: #ffffff;
  padding: 24px;
}

/* 空数据状态 */
.empty-tree {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 14px;
  color: #94a3b8;
}

/* 类目树样式 */
.category-tree {
  font-size: 14px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.category-tree :deep(.el-tree-node__content) {
  height: 32px;
  line-height: 32px;
  border-radius: 8px;
  margin: 2px 0;
  transition: background-color 0.15s ease;
}

.category-tree :deep(.el-tree-node__content:hover) {
  background-color: #f1f5f9;
}

.category-tree :deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background-color: #dbeafe;
  color: #2563eb;
}

.category-tree :deep(.el-tree-node__expand-icon) {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.category-tree :deep(.el-tree-node__expand-icon svg) {
  width: 16px;
  height: 16px;
}

/* 弹窗底部 */
.cat-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 28px 32px;
  background-color: #f8fafc;
}

.btn-cancel {
  min-width: 66px;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background-color: #e2e8f0;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-cancel:hover {
  background-color: #cbd5e1;
}

.btn-confirm {
  min-width: 66px;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 650;
  color: #ffffff;
  background-color: #3b82f6;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-confirm:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

.scale-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-5px);
}

.tree-loading-fade-enter-active,
.tree-loading-fade-leave-active {
  transition: opacity 0.2s ease;
}

.tree-loading-fade-enter-from,
.tree-loading-fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
