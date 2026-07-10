<template>
  <MainLayout>
    <div class="app-page app-page-stack app-page--fixed image-library-container">
      <!-- 统计信息 -->
      <StatCardGrid :items="statItems" />
      <el-row :gutter="16" class="stats-row" style="display: none;">
        <el-col :span="6"></el-col>
        <el-col :span="6"></el-col>
        <el-col :span="6"></el-col>
        <el-col :span="6"></el-col>
      </el-row>
      <!-- 素材列表 -->
      <el-card class="app-page-card app-page-card--fill images-card">
        <Transition name="fade" mode="out-in">
          <div v-if="loading || images.length === 0" key="empty-local" class="empty-state"
            @click="showUploadDialog = true">
            <AppSkeletonLoader v-if="loading" variant="card" :rows="5" compact />
            <AppEmpty v-else title="暂无素材" description="点击此处上传素材" />
          </div>
          <div v-else key="grid-local" class="images-grid" @scroll="handleScroll">
            <!-- 上传占位卡片 -->
            <div class="image-item upload-placeholder" @click="showUploadDialog = true">
              <div class="upload-placeholder-wrapper">
                <el-icon class="upload-icon">
                  <Upload />
                </el-icon>
                <p class="upload-text">上传素材</p>
              </div>
            </div>
            <div v-for="image in images" :key="image.id" class="image-item" :class="{ 'image-item-used': image.isUsed }">
              <div class="image-wrapper">
                <AppImage
                  :src="image.fileUrl"
                  fit="cover"
                  class="main-image"
                  preview
                  :preview-src-list="[image.fileUrl]"
                  :initial-index="0"
                  error-text="素材加载失败"
                  empty-text="暂无素材"
                /><!-- 使用状态标- 左上-->
                <div v-if="image.isUsed" class="usage-badge" title="已被商品使用">
                  <el-icon class="usage-badge-icon">
                    <Check />
                  </el-icon>
                </div>
                <div class="image-info-overlay">
                  <div class="image-filename">{{ image.fileName }}</div>
                  <div class="image-date">
                    {{ formatDate(image.createdAt) }}
                  </div>
                </div>
                <div class="image-actions-top">
                  <el-icon v-if="!image.isUsed" class="action-icon delete-icon" @click.stop="handleDelete(image)"
                    title="删除">
                    <Delete />
                  </el-icon>
                  <el-icon v-else class="action-icon delete-icon-disabled" title="图片正在使用，禁止删除">
                    <Delete />
                  </el-icon>
                </div>
              </div>
            </div>
            <!-- 加载更多提示 -->
            <div v-if="isLoadingMore" class="loading-more">
              <el-icon class="loading-icon"><Loading /></el-icon>
              <span>加载中...</span>
            </div>
          </div>
        </Transition>
      </el-card>
      <UploadDialog
        v-model:visible="showUploadDialog"
        v-model:fileList="uploadFileList"
        :progress="uploadProgress"
        :status="uploadStatus"
        :uploaded="uploadedCount"
        ref="uploadDialogRef"
        @upload="handleUpload"
        @fileChange="handleFileChange"
        @remove="handleRemove"
        @preview="handlePictureCardPreview"
        @exceed="handleExceed"
      />
      <!-- 图片预览对话 -->
      <el-dialog v-model="dialogVisible" title="图片预览" width="600px">
        <AppImage :src="dialogImageUrl" alt="预览图片" style="width: 100%; height: 420px;" fit="contain" />
      </el-dialog>
      <AppDeleteConfirmDialog
        v-model="showDeleteDialog"
        message="确定要删除选中的素材吗？此操作不可恢复"
        @confirm="confirmDelete"
      />
    </div>
  </MainLayout>
</template>
<script setup lang="ts">
import MainLayout from '@/components/MainLayout.vue';
import AppDeleteConfirmDialog from '@/components/ui/AppDeleteConfirmDialog.vue';
import AppEmpty from '@/components/ui/AppEmpty.vue';
import AppImage from '@/components/ui/AppImage.vue';
import AppSkeletonLoader from '@/components/ui/AppSkeletonLoader.vue';
import UploadDialog from './components/UploadDialog.vue';
import StatCardGrid from '@/components/ui/StatCardGrid.vue';
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Upload,
  Delete,
  Check,
  Loading
} from '@element-plus/icons-vue';
import {
  getImages,
  getImageStats,
  uploadImage,
  deleteImage,
  batchDeleteImages
} from '@/api/imageAPI';
const loading = ref(false);
const images = ref<any[]>([]);
const stats = reactive({
  total: 0,
  todayCount: 0,
  totalSize: 0,
  totalStorage: 0,
  usedStorage: 0,
  availableStorage: 0
});

const statItems = computed(() => [
  {
    label: '图片数量',
    value: stats.total !== undefined ? stats.total : 0,
    type: 'total' as const,
  },
  {
    label: '总储存',
    value: stats.totalStorage !== undefined ? formatFileSize(stats.totalStorage) : '-',
    type: 'package' as const,
  },
  {
    label: '使用储存',
    value: stats.usedStorage !== undefined ? formatFileSize(stats.usedStorage) : '-',
    type: 'growth' as const,
  },
  {
    label: '可用储存',
    value: stats.availableStorage !== undefined ? formatFileSize(stats.availableStorage) : '-',
    type: 'listed' as const,
  },
]);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const selectedImages = ref<any[]>([]);
const isLoadingMore = ref(false);
const hasMore = ref(true);
const showUploadDialog = ref(false);
const showDeleteDialog = ref(false);
const uploadFileList = ref<any[]>([]);
const dialogImageUrl = ref('');
const dialogVisible = ref(false);
const uploadProgress = ref(0);
const uploadStatus = ref<'success' | 'exception' | 'warning' | 'info'>('info');
const uploadedCount = ref(0);
const fetchImagesRequestId = ref(0);
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 MB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
const showMessage = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
  const content = message ? `${title}：${message}` : title;
  ElMessage[type](content);
};
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) {
    return '刚刚';
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  }
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`;
  }
  return date.toLocaleDateString('zh-CN');
};
const fetchImages = async (append = false) => {
  const requestId = ++fetchImagesRequestId.value;
  try {
    if (append) {
      isLoadingMore.value = true;
    } else {
      loading.value = true;
      images.value = [];
    }
    const response = await getImages({
      page: page.value,
      pageSize: pageSize.value,
      source: 'local',
      bizType: 'product'
    });
    if (requestId !== fetchImagesRequestId.value) {
      return;
    }
    if (response && response.success && response.data) {
      if (append) {
        images.value = [...images.value, ...response.data.images];
      } else {
        images.value = response.data.images;
      }
      total.value = response.data.total;
      hasMore.value = images.value.length < total.value;
    } else {
      showMessage('获取素材失败', response?.message || '未知错误', 'error');
    }
  } catch (error) {
    if (requestId !== fetchImagesRequestId.value) {
      return;
    }
    showMessage('获取素材失败', '服务器错误误', 'error');
  } finally {
    if (requestId === fetchImagesRequestId.value) {
      loading.value = false;
      isLoadingMore.value = false;
    }
  }
};
const fetchStats = async () => {
  try {
    const response = await getImageStats({
      source: 'local',
      bizType: 'product'
    });
    if (response && response.success) {
      Object.assign(stats, response.data);
    } else {
      showMessage('获取统计信息失败', response?.message || '未知错误', 'error');
    }
  } catch {
  }
};
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  const scrollTop = target.scrollTop;
  const scrollHeight = target.scrollHeight;
  const clientHeight = target.clientHeight;
  if (scrollTop + clientHeight >= scrollHeight - 200 && hasMore.value && !isLoadingMore.value && !loading.value) {
    page.value++;
    fetchImages(true);
  }
};
const handleDelete = (image: any) => {
  if (image.isUsed) {
    showMessage('禁止删除', '图片正在使用，禁止删除', 'warning');
    return;
  }
  selectedImages.value = [image];
  showDeleteDialog.value = true;
};
const confirmDelete = async () => {
  try {
    if (selectedImages.value.length === 1) {
      const response = await deleteImage(selectedImages.value[0].id, 'local');
      if (response && response.success) {
        showMessage('删除成功', '素材已删除', 'success');
      } else {
        showMessage('删除失败', response?.message || '未知错误', 'error');
      }
    } else {
      const response = await batchDeleteImages(selectedImages.value.map(img => img.id), 'local');
      if (response && response.success) {
        showMessage('删除成功', `已删${selectedImages.value.length}个素材`, 'success');
      } else {
        showMessage('删除失败', response?.message || '未知错误', 'error');
      }
    }
    showDeleteDialog.value = false;
    selectedImages.value = [];
    fetchImages();
    fetchStats();
  } catch {
    showMessage('删除失败', '服务器错误', 'error');
  }
};
const handleFileChange = (_file: any, fileList: any) => {
  uploadFileList.value = fileList;
};
const handleRemove = (_file: any, fileList: any) => {
  uploadFileList.value = fileList;
};
const handlePictureCardPreview = (file: any) => {
  dialogImageUrl.value = file.url;
  dialogVisible.value = true;
};
const handleExceed = (_files: any, fileList: any) => {
  ElMessage.warning(`单次最多上8 个文件，当前已选择 ${fileList.length} 个文件`);
};

const cleanUploadErrorMessage = (message: unknown): string => {
  if (typeof message !== 'string' || !message.trim()) {
    return '未知错误';
  }

  return message
    .trim()
    .replace(/^服务器错误[:：]\s*/, '')
    .replace(/^上传失败[:：]\s*/, '');
};

const getUploadErrorMessage = (error: any): string => {
  return cleanUploadErrorMessage(
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    error
  );
};

const formatUploadFailureMessage = (failMessages: string[], failCount: number): string => {
  if (failMessages.length === 0) {
    return `${failCount} 个文件上传失败`;
  }

  if (failMessages.length === 1) {
    return failMessages[0];
  }

  const displayedMessages = failMessages.slice(0, 3);
  const remainingCount = failMessages.length - displayedMessages.length;
  return remainingCount > 0
    ? `${displayedMessages.join('\n')}，另有 ${remainingCount} 个文件上传失败`
    : displayedMessages.join('\n');
};

const handleUpload = async () => {
  if (uploadFileList.value.length === 0) {
    ElMessage.warning('请先选择要上传的素材');
    return;
  }
  // 初始化进  uploadProgress.value = 0;
  uploadStatus.value = 'info';
  uploadedCount.value = 0;
  const totalFiles = uploadFileList.value.length;
  let successCount = 0;
  let failCount = 0;
  const failMessages: string[] = [];
  try {
    for (let i = 0; i < totalFiles; i++) {
      const file = uploadFileList.value[i];
      try {
        const response = await uploadImage(file.raw, 'local', 'product');
        if (response && response.success) {
          successCount++;
        } else {
          failCount++;
          const message = cleanUploadErrorMessage(response?.message);
          failMessages.push(`${file.name}：${message}`);
        }
      } catch (error) {
        failCount++;
        const message = getUploadErrorMessage(error);
        failMessages.push(`${file.name}：${message}`);
      }
      // 更新进度
      uploadedCount.value = i + 1;
      uploadProgress.value = Math.round(((i + 1) / totalFiles) * 100);
    }
    // 完成上传
    uploadStatus.value = failCount > 0 ? 'warning' : 'success';
    if (successCount > 0) {
      showMessage('上传成功', `成功上传 ${successCount} 个文件`, 'success');
    }
    if (failCount > 0) {
      showMessage('上传失败', formatUploadFailureMessage(failMessages, failCount), 'error');
    }
    // 延迟关闭，让用户看到完成状态
    setTimeout(() => {
      showUploadDialog.value = false;
      uploadProgress.value = 0;
      uploadFileList.value = [];
      fetchImages();
      fetchStats();
    }, 500);
  } catch (error: any) {
    uploadStatus.value = 'exception';
    let errorMessage = '服务器错误';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.response.data) {
      errorMessage = JSON.stringify(error.response.data);
    }
    showMessage('上传失败', errorMessage, 'error');
    setTimeout(() => {
      uploadProgress.value = 0;
    }, 1000);
  }
};
onMounted(() => {
  fetchImages();
  fetchStats();
});
</script>
<style scoped>
.image-library-container {
  padding: 0;
  max-width: 100%;
  margin: 0 auto;
  gap: 0;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 10px;
}

.page-header p {
  font-size: 14px;
  color: #666;
}

.stats-row {
  margin-bottom: 20px;
}

.stats-card {
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  height: 100px;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stats-content {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stats-icon.total {
  background: linear-gradient(135deg, #409eff 0%, #69c0ff 100%);
}

.stats-icon.totalStorage {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.stats-icon.usedStorage {
  background: linear-gradient(135deg, #e6a23c 0%, #f0c16e 100%);
}

.stats-icon.availableStorage {
  background: linear-gradient(135deg, #409eff 0%, #69c0ff 100%);
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.stats-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.tab-header {
  padding: 0 20px;
  margin-bottom: 0;
  display: flex;
  justify-content: flex-start;
  height: 64px;
}

.tabs-section {
  display: flex;
  align-items: center;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.images-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.images-card :deep(.el-card__body) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
}

/* 切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(126px, 1fr));
  gap: 14px;
  min-height: 400px;
  max-height: calc(100vh - 320px);
  overflow-y: auto;
  padding: 18px;
  align-content: flex-start;
}

.image-item {
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  aspect-ratio: 1 / 1;
}

.image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.upload-placeholder {
  border: 2px dashed #d9d9d9;
  background-color: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  aspect-ratio: 1 / 1;
}

.upload-placeholder:hover {
  border-color: #409eff;
  background-color: #ecf5ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
}

.upload-placeholder-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 38px;
  color: #c0c4cc;
}

.upload-placeholder:hover .upload-icon {
  color: #409eff;
}

.upload-text {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

.upload-placeholder:hover .upload-text {
  color: #409eff;
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f0f0f0;
  overflow: hidden;
}

.main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 50%, transparent 100%);
  color: white;
  padding: 34px 10px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-filename {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-date {
  font-size: 10px;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-actions-top {
  position: absolute;
  top: 7px;
  right: 7px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-item:hover .image-actions-top {
  opacity: 1;
}

.action-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  color: #333;
}

.action-icon:hover {
  background: #409eff;
  color: white;
}

.delete-icon:hover {
  background: #f56c6c;
  color: white;
}

.empty-state {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  grid-column: 1 / -1;
}

.loading-icon {
  margin-right: 8px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.image-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  color: #909399;
  gap: 8px;
}

.image-error p {
  font-size: 12px;
}

.usage-badge {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  width: 0;
  height: 0;
  border-top: 32px solid #22c55e;
  border-right: 32px solid transparent;
}

.usage-badge-icon {
  position: absolute;
  top: -31px;
  left: 4px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
}

.delete-icon-disabled {
  cursor: not-allowed;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.78);
}

.delete-icon-disabled:hover {
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.78);
}

.image-item-used .image-actions-top {
  opacity: 1;
}
</style>
