<template>
  <el-dialog v-model="dialogVisible" width="540px" class="upload-dialog" :show-close="false">
    <template #header>
      <div class="app-surface-header">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-2xl"><Picture /></el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <h3 class="app-surface-title">选择图片</h3>
          <p class="app-surface-subtitle">从系统图片库选择，或上传新图片</p>
        </div>
      </div>
    </template>

    <el-tabs v-model="activeTab" class="gallery-tabs" @tab-change="handleTabChange">
      <el-tab-pane name="local">
        <template #label>
          <span class="tab-label">
            <el-icon><Folder /></el-icon>
            <span>图片库</span>
          </span>
        </template>
        <div class="upload-description">
          <div class="flex items-start">
            <el-icon class="text-blue-500 text-sm mt-0.5 mr-2 flex-shrink-0"><InfoFilled /></el-icon>
            <p>支持从系统图片库选择已上传的商品图片</p>
          </div>
        </div>
        <div v-if="sourceLoading" class="loading-container">
          <AppSkeletonLoader variant="card" :rows="4" compact />
        </div>
        <div v-else-if="sourceImages.length === 0" class="empty-container">
          <AppEmpty title="暂无图片" description="系统图片库暂无商品图片" />
        </div>
        <div v-else class="image-grid">
          <div
            v-for="image in sourceImages"
            :key="getSelectionKey(image)"
            class="image-item"
            :class="{ selected: selectedImageKeys.includes(getSelectionKey(image)) }"
            @click="toggleImageSelection(image)"
          >
            <AppImage :src="image.fileUrl" fit="cover" class="gallery-image" error-text="加载失败" empty-text="暂无图片" />
            <div v-if="selectedImageKeys.includes(getSelectionKey(image))" class="selected-overlay">
              <el-icon class="check-icon"><Check /></el-icon>
            </div>
            <div class="image-info">
              <span class="image-name">{{ image.fileName }}</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="upload">
        <template #label>
          <span class="tab-label">
            <el-icon><Upload /></el-icon>
            <span>上传新图</span>
          </span>
        </template>
        <div class="upload-description">
          <div class="flex items-start">
            <el-icon class="text-blue-500 text-sm mt-0.5 mr-2 flex-shrink-0"><InfoFilled /></el-icon>
            <p>上传后保存到系统图片库，可直接用于商品上架</p>
          </div>
        </div>
        <div class="upload-grid">
          <div v-for="(item, index) in previewImages" :key="index" class="grid-item image-item">
            <AppImage :src="item.url" :alt="item.name" class="grid-image" error-text="加载失败" empty-text="暂无图片" />
            <div class="image-overlay">
              <el-icon class="remove-icon" @click.stop="removePreviewImage(index)">
                <Delete />
              </el-icon>
            </div>
          </div>
          <div v-if="previewImages.length < maxSelectableCount" class="grid-item upload-placeholder" @click="triggerUpload">
            <el-icon class="plus-icon"><Plus /></el-icon>
          </div>
          <div
            v-for="n in Math.max(0, maxSelectableCount - previewImages.length - 1)"
            :key="'empty-' + n"
            class="grid-item empty-item"
          />
        </div>
        <el-upload
          ref="uploadRef"
          class="hidden-upload"
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          :before-upload="beforeUpload"
          :file-list="fileList"
          :show-file-list="false"
          multiple
          :limit="maxSelectableCount"
          :on-exceed="handleExceed"
        />
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <span class="dialog-footer">
        <span class="upload-count">已选择<span class="limit-text">{{ selectedCount }}</span> / {{ maxSelectableCount }} 张图</span>
        <div class="dialog-buttons">
          <el-button class="btn-cancel" @click="handleCancel">取消</el-button>
          <el-button class="btn-confirm" type="primary" @click="handleConfirm" :disabled="selectedCount === 0">确定</el-button>
        </div>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Check, Delete, Folder, InfoFilled, Picture, Plus, Upload } from '@element-plus/icons-vue';
import { getImages, uploadImage } from '@/api/imageAPI';
import AppEmpty from '@/components/ui/AppEmpty.vue';
import AppImage from '@/components/ui/AppImage.vue';
import AppSkeletonLoader from '@/components/ui/AppSkeletonLoader.vue';

type PickerTab = 'local' | 'upload';

interface ImageItem {
  id: number | string;
  provider?: 'local';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

interface PreviewImageItem {
  name: string;
  url: string;
  file: File;
}

interface Props {
  modelValue: boolean;
  maxCount: number;
  existingImageIds: Array<number | string>;
  existingImageUrls?: string[];
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', selectedImages: Array<number | string>, newImages: any[], selectedImageData: ImageItem[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  maxCount: 8,
  existingImageIds: () => [],
  existingImageUrls: () => [],
});

const emit = defineEmits<Emits>();

const dialogVisible = ref(false);
const activeTab = ref<PickerTab>('local');
const sourceImages = ref<ImageItem[]>([]);
const sourceLoading = ref(false);
const selectedImageKeys = ref<string[]>([]);
const selectedImageDataMap = ref<Map<string, ImageItem>>(new Map());
const fileList = ref<any[]>([]);
const previewImages = ref<PreviewImageItem[]>([]);
const uploadRef = ref<any>(null);
const fetchRequestToken = ref(0);
const maxSelectableCount = computed(() => Math.max(0, props.maxCount || 8));
const selectedCount = computed(() => selectedImageKeys.value.length + previewImages.value.length);

const getSelectionKey = (image: ImageItem) => `local-${image.id}`;

const resetState = () => {
  activeTab.value = 'local';
  selectedImageKeys.value = props.existingImageIds.map(id => `local-${id}`);
  selectedImageDataMap.value.clear();
  sourceImages.value = [];
  sourceLoading.value = false;
  fileList.value = [];
  previewImages.value.forEach(item => URL.revokeObjectURL(item.url));
  previewImages.value = [];
};

const deferToNextPaint = () => new Promise<void>(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const fetchImages = async (requestToken = fetchRequestToken.value) => {
  const loadingStartedAt = performance.now();
  try {
    sourceLoading.value = true;
    const response = await getImages({
      page: 1,
      pageSize: 200,
      source: 'local',
      bizType: 'product',
    });
    if (response.success && response.data) {
      const images = (response.data.images || []).map((image: ImageItem) => ({
        ...image,
        provider: 'local' as const,
      }));
      if (requestToken !== fetchRequestToken.value) return;
      sourceImages.value = images;
      images.forEach(image => {
        const key = getSelectionKey(image);
        selectedImageDataMap.value.set(key, image);
        if (props.existingImageUrls.includes(image.fileUrl) && !selectedImageKeys.value.includes(key)) {
          selectedImageKeys.value.push(key);
        }
      });
    } else {
      if (requestToken !== fetchRequestToken.value) return;
      ElMessage.error(response.message || '获取图片列表失败');
    }
  } catch {
    if (requestToken !== fetchRequestToken.value) return;
    ElMessage.error('获取系统图片库失败');
  } finally {
    if (requestToken === fetchRequestToken.value) {
      const elapsed = performance.now() - loadingStartedAt;
      if (elapsed < 220) {
        await delay(220 - elapsed);
      }
      sourceLoading.value = false;
    }
  }
};

const fetchImagesDeferred = async () => {
  const requestToken = ++fetchRequestToken.value;
  sourceLoading.value = true;
  await deferToNextPaint();
  await fetchImages(requestToken);
};

const handleTabChange = (tabName: string | number) => {
  if (tabName === 'local') {
    void fetchImagesDeferred();
  }
};

const toggleImageSelection = (image: ImageItem) => {
  const key = getSelectionKey(image);
  const index = selectedImageKeys.value.indexOf(key);
  if (index > -1) {
    selectedImageKeys.value.splice(index, 1);
    return;
  }
  if (selectedCount.value >= maxSelectableCount.value) {
    ElMessage.warning(`最多只能选择${maxSelectableCount.value}张图片`);
    return;
  }
  selectedImageKeys.value.push(key);
  selectedImageDataMap.value.set(key, image);
};

const triggerUpload = () => {
  if (!uploadRef.value) return;
  uploadRef.value.clearFiles();
  fileList.value = [];
  const input = uploadRef.value.$el.querySelector('input[type="file"]');
  if (input) {
    input.value = '';
    input.click();
  }
};

const beforeUpload = (file: File) => {
  const isValidType = file.type.startsWith('image/');
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isValidType) {
    ElMessage.error('只能上传图片文件!');
    return false;
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB!');
    return false;
  }
  return true;
};

const handleFileChange = (file: any) => {
  if (selectedCount.value >= maxSelectableCount.value) {
    ElMessage.warning(`最多只能选择${maxSelectableCount.value}张图片`);
    return;
  }
  const rawFile = file.raw;
  if (!rawFile) return;

  const isDuplicateInPreview = previewImages.value.some(img => img.name === rawFile.name);
  if (isDuplicateInPreview) {
    ElMessage.warning(`"${rawFile.name}" 已在待上传列表中，请勿重复选择`);
    return;
  }

  const isAlreadySelected = selectedImageKeys.value.some(key => {
    const imgData = selectedImageDataMap.value.get(key);
    return imgData && imgData.fileName === rawFile.name;
  });
  if (isAlreadySelected) {
    ElMessage.warning(`"${rawFile.name}" 已选择，无需重复上传`);
    return;
  }

  previewImages.value.push({
    name: rawFile.name,
    url: URL.createObjectURL(rawFile),
    file: rawFile,
  });
};

const handleExceed = () => {
  ElMessage.warning(`最多只能选择${maxSelectableCount.value}张图片`);
};

const removePreviewImage = (index: number) => {
  const item = previewImages.value[index];
  if (item?.url) URL.revokeObjectURL(item.url);
  previewImages.value.splice(index, 1);
};

const handleCancel = () => {
  if (uploadRef.value) uploadRef.value.clearFiles();
  dialogVisible.value = false;
};

const handleConfirm = async () => {
  try {
    const uploadedImages: Array<{ id?: number | string; fileUrl: string }> = [];
    for (const item of previewImages.value) {
      const response = await uploadImage(item.file, 'local', 'product');
      if (response.success && response.data) {
        uploadedImages.push({ id: response.data.id, fileUrl: response.data.fileUrl });
      } else {
        ElMessage.error(`上传图片 ${item.name} 失败`);
        return;
      }
    }

    const selectedImageData = selectedImageKeys.value
      .map(key => selectedImageDataMap.value.get(key))
      .filter((image): image is ImageItem => Boolean(image));

    const selectedLocalImageIds = selectedImageData
      .map(image => image.id);

    const allSelectedImageIds = [
      ...selectedLocalImageIds,
      ...uploadedImages.map(img => img.id).filter((id): id is number | string => id !== undefined && id !== null),
    ];

    emit('confirm', allSelectedImageIds, uploadedImages, selectedImageData);
    if (uploadRef.value) uploadRef.value.clearFiles();
    dialogVisible.value = false;
  } catch {
    ElMessage.error('上传图片失败');
  }
};

watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal;
  if (newVal) {
    resetState();
    void fetchImagesDeferred();
  } else {
    fetchRequestToken.value++;
  }
});

watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal);
});
</script>

<style scoped>
.gallery-tabs {
  margin-bottom: 0;
  border-bottom: none;
}

.upload-dialog {
  max-width: calc(100vw - 48px);
}

.upload-dialog :deep(.el-dialog__header) {
  padding: 18px 20px 0;
}

.upload-dialog :deep(.el-dialog__body) {
  padding: 0 20px 12px;
}

.upload-dialog :deep(.el-dialog__footer) {
  padding: 0 20px 18px;
}

.upload-dialog :deep(.app-surface-header) {
  min-height: 96px;
  padding: 18px 24px;
}

.gallery-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 10px;
  height: 42px;
  display: flex;
  align-items: center;
  background: transparent;
  border-bottom: none;
}

.gallery-tabs :deep(.el-tabs__nav-wrap) {
  margin-bottom: 0;
}

.gallery-tabs :deep(.el-tabs__item) {
  height: 42px;
  line-height: 42px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  margin-right: 0;
  border-bottom: none;
}

.gallery-tabs :deep(.el-tabs__item.is-active) {
  color: #2563eb;
  font-weight: 600;
}

.gallery-tabs :deep(.el-tabs__active-bar),
.gallery-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.gallery-tabs :deep(.el-tabs__content) {
  border-top: none;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.loading-container,
.empty-container {
  height: 218px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(4, 104px);
  grid-auto-rows: 104px;
  gap: 10px;
  height: 218px;
  overflow-y: auto;
  justify-content: center;
  padding: 0 6px;
}

.image-item {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background: #ffffff;
}

.image-item:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
}

.image-item.selected {
  border-color: #2563eb;
}

.gallery-image,
.grid-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-overlay {
  position: absolute;
  inset: 0;
  background: rgba(37, 99, 235, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  font-size: 24px;
  color: #fff;
  background: #2563eb;
  border-radius: 50%;
  padding: 3px;
}

.image-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, transparent 100%);
  color: white;
  padding: 20px 6px 6px;
}

.image-name {
  display: block;
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-description {
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  padding: 7px 10px;
  margin: 0 0 12px;
  font-size: 12px;
  color: #1e40af;
}

.upload-description p {
  margin: 0;
  font-size: 12px;
  color: #1e40af;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(4, 104px);
  grid-template-rows: repeat(2, 104px);
  gap: 10px;
  height: 218px;
  overflow: hidden;
  padding: 0 6px;
  justify-content: center;
}

.grid-item {
  width: 104px;
  height: 104px;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.upload-placeholder {
  border: 2px dashed #d9d9d9;
  background-color: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.upload-placeholder:hover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.plus-icon {
  font-size: 24px;
  color: #c0c4cc;
  transition: all 0.2s ease;
}

.upload-placeholder:hover .plus-icon {
  color: #409eff;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
}

.image-item:hover .image-overlay {
  background: rgba(0, 0, 0, 0.5);
  opacity: 1;
}

.remove-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  color: #606266;
  transition: all 0.2s ease;
}

.remove-icon:hover {
  background: #f56c6c;
  color: white;
}

.empty-item {
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
}

.hidden-upload {
  display: none;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.upload-count {
  font-size: 13px;
  color: #64748b;
}

.limit-text {
  color: #3b82f6;
  font-weight: 600;
}

.dialog-buttons {
  display: flex;
  gap: 12px;
}

.upload-dialog :deep(.el-dialog__footer) {
  border-top: none;
}

.image-grid::-webkit-scrollbar,
.upload-grid::-webkit-scrollbar {
  width: 6px;
}

.image-grid::-webkit-scrollbar-track,
.upload-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.image-grid::-webkit-scrollbar-thumb,
.upload-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.image-grid::-webkit-scrollbar-thumb:hover,
.upload-grid::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
