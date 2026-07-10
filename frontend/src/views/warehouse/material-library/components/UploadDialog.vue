<template>
  <el-dialog v-model="dialogVisible" width="560px" class="upload-dialog material-upload-dialog" :show-close="false">
    <template #header>
      <div class="app-surface-header">
        <div class="app-surface-icon">
          <el-icon class="text-blue-600 text-2xl"><Picture /></el-icon>
        </div>
        <div class="app-surface-title-wrapper">
          <h3 class="app-surface-title">上传素材</h3>
          <p class="app-surface-subtitle">请选择要上传到素材库的图片</p>
        </div>
      </div>
    </template>

    <div class="material-upload-main">
      <!-- 上传说明 -->
      <div class="upload-description">
        <div class="flex items-start">
          <el-icon class="text-blue-500 text-base mt-0.5 mr-2 flex-shrink-0"><InfoFilled /></el-icon>
          <p>支持 JPG、PNG、GIF 等图片格式，单个文件不超5MB，最多上8 张</p>
        </div>
      </div>

      <!-- 标准照片墙：v-model + picture-card -->
      <div class="photo-wall-container">
        <el-upload
          ref="uploadRef"
          v-model:file-list="innerFileList"
          action="#"
          :auto-upload="false"
          list-type="picture-card"
          :multiple="true"
          :limit="8"
          :on-exceed="handleExceed"
          :before-upload="beforeUpload"
          :on-preview="handlePreview"
          :on-remove="handleRemove"
          class="photo-wall-upload"
          :class="{ 'hide-trigger': innerFileList.length >= 8 }"
        >
          <el-icon><Plus /></el-icon>
        </el-upload>
      </div>

      <!-- 上传进度 -->
      <div v-if="progress > 0 && progress < 100" class="upload-progress">
        <el-progress :percentage="progress" :status="status" />
        <span class="progress-text">正在上传：{{ uploaded }}/{{ innerFileList.length }}</span>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <span class="upload-count">已选择 <span class="limit-text">{{ innerFileList.length }}</span> / 8</span>
        <div class="dialog-buttons">
          <el-button class="btn-cancel" @click="handleCancel">取消</el-button>
          <el-button
            type="primary"
            class="btn-confirm"
            :disabled="!innerFileList.length || progress > 0"
            @click="handleUpload"
          >
            {{ progress > 0 ? '上传中..' : `上传 (${innerFileList.length})` }}
          </el-button>
        </div>
      </span>
    </template>

    <!-- 图片预览 -->
    <el-dialog v-model="previewVisible" width="600px" append-to-body>
      <img :src="previewUrl" alt="预览" style="width: 100%" />
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Picture, InfoFilled, Plus } from '@element-plus/icons-vue';

interface Props {
  visible: boolean;
  fileList: any[];
  progress: number;
  status: 'success' | 'exception' | 'warning' | 'info';
  uploaded: number;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  fileList: () => [],
  progress: 0,
  status: 'info',
  uploaded: 0,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'update:fileList': [value: any[]];
  upload: [];
  preview: [file: any];
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit('update:visible', val),
});

// 内部文件列表（v-model 双向绑定）
const innerFileList = ref<any[]>([]);

// 外部 fileList 变化时同步
watch(() => props.fileList, (val) => {
  if (val && val.length !== innerFileList.value.length) {
    innerFileList.value = [...val];
  }
}, { deep: true });

// innerFileList 变化时同步回父组件
watch(innerFileList, (val) => {
  emit('update:fileList', val);
}, { deep: true });

const uploadRef = ref<any>(null);
const previewVisible = ref(false);
const previewUrl = ref('');

const handleExceed = () => {
  ElMessage.warning('最多只能上传 8 张图片');
};

const beforeUpload = (file: File) => {
  const isImage = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type);
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isImage) { ElMessage.error('只支持 JPG、PNG、GIF 格式!'); return false; }
  if (!isLt5M) { ElMessage.error('图片大小不能超过 5MB!'); return false; }
  return false; // 阻止自动上传
};

const handlePreview = (file: any) => {
  previewUrl.value = file.url || URL.createObjectURL(file.raw);
  previewVisible.value = true;
  emit('preview', file);
};

const handleRemove = (_file: any) => {
  // v-model:file-list 自动处理移除，无需手动操作
};

const handleCancel = () => {
  emit('update:visible', false);
};

const handleUpload = () => {
  emit('upload');
};

const clearFiles = () => {
  uploadRef.value?.clearFiles();
  innerFileList.value = [];
};

defineExpose({ clearFiles });
</script>

<style scoped>
.upload-description {
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #1e40af;
}

.material-upload-main {
  display: flex;
  min-height: 350px;
  flex-direction: column;
  justify-content: center;
}

.upload-progress {
  margin-top: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.progress-text {
  margin-left: 12px;
  font-size: 13px;
  color: #64748b;
}

.upload-count {
  font-size: 13px;
  color: #64748b;
  margin-right: 16px;
}

.limit-text {
  color: #3b82f6;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.dialog-buttons {
  display: flex;
  gap: 10px;
}

.dialog-buttons :deep(.el-button + .el-button) {
  margin-left: 0;
}

/* 照片墙容器：固定高度，对齐宽度 */
.photo-wall-container {
  width: 100%;
  min-height: 276px; /* 两行：120px*4 + 12px*3gap + padding */
}
</style>

<style>
body .material-upload-dialog .el-dialog__body {
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  padding-bottom: 12px;
}

body .material-upload-dialog .el-dialog__footer {
  padding-top: 12px;
}

/* 照片墙样式 */
.upload-dialog .photo-wall-upload {
  width: 100%;
}

.upload-dialog .photo-wall-upload .el-upload--picture-card {
  width: 120px !important;
  height: 120px !important;
  border-radius: 8px !important;
  margin-right: 12px !important;
  margin-bottom: 12px !important;
}

.upload-dialog .photo-wall-upload .el-upload-list--picture-card {
  width: 100%;
}

.upload-dialog .photo-wall-upload .el-upload-list--picture-card .el-upload-list__item {
  width: 120px !important;
  height: 120px !important;
  border-radius: 8px !important;
  margin-right: 12px !important;
  margin-bottom: 12px !important;
}

/* 满8张隐藏上传按钮 */
.upload-dialog .photo-wall-upload.hide-trigger .el-upload--picture-card {
  display: none !important;
}
</style>
