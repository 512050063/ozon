<template>
  <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="mx-4 w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
      <div class="app-surface-header mb-6">
        <div class="app-surface-icon">
          <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="app-surface-title-wrapper">
          <h3 class="app-surface-title">编辑头像</h3>
          <p class="app-surface-subtitle">选择系统头像、本地上传，或从历史头像中快速切换</p>
        </div>
      </div>

      <div class="space-y-6">
        <section>
          <div class="mb-3 flex items-center gap-2">
            <span class="h-4 w-1 rounded-full bg-blue-500"></span>
            <h4 class="text-sm font-semibold text-slate-800">系统头像</h4>
          </div>
          <div class="grid grid-cols-5 gap-3">
            <button
              v-for="(avatar, index) in systemAvatars"
              :key="index"
              @click="selectAvatar(avatar)"
              :class="avatarButtonClass(avatar)"
            >
              <img :src="avatar" class="h-full w-full object-cover" alt="系统头像" />
            </button>
          </div>
        </section>

        <section>
          <div class="mb-3 flex items-center gap-2">
            <span class="h-4 w-1 rounded-full bg-blue-500"></span>
            <h4 class="text-sm font-semibold text-slate-800">历史头像</h4>
          </div>
          <div class="grid grid-cols-5 gap-3">
            <div
              v-for="(avatar, index) in historyAvatarSlots"
              :key="avatar || `placeholder-${index}`"
              class="history-avatar-wrapper"
            >
              <button
                type="button"
                :disabled="!avatar"
                @click="avatar && selectAvatar(avatar)"
                :class="[
                  'history-avatar-item',
                  avatar ? avatarButtonClass(avatar) : 'history-avatar-placeholder',
                ]"
              >
                <img v-if="avatar" :src="getAvatarUrl(avatar)" class="h-full w-full object-cover" alt="历史头像" />
                <div v-else class="history-avatar-empty">
                  <span class="history-avatar-empty-text">无</span>
                </div>
              </button>
              <button
                v-if="avatar"
                type="button"
                class="history-avatar-delete"
                :disabled="deletingAvatar === avatar"
                @click.stop="removeHistoryAvatar(avatar)"
              >
                ×
              </button>
            </div>
          </div>
        </section>

        <section>
          <div class="mb-3 flex items-center gap-2">
            <span class="h-4 w-1 rounded-full bg-blue-500"></span>
            <h4 class="text-sm font-semibold text-slate-800">本地上传</h4>
          </div>
          <div
            class="upload-panel"
            :class="{ 'upload-panel-dragging': isDragging }"
            @click="openFileSelector"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              class="hidden"
              @change="handleFileSelect"
            />
            <template v-if="previewImage">
              <div class="flex items-center gap-4">
                <img :src="previewImage" class="h-16 w-16 rounded-xl object-cover" alt="预览" />
                <div class="min-w-0 flex-1 text-left">
                  <p class="truncate text-sm font-medium text-slate-800">{{ selectedFileName }}</p>
                  <p class="mt-1 text-xs text-slate-500">将保存到本地图库，并加入历史头像</p>
                </div>
                <button
                  class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-red-200 hover:text-red-500"
                  @click.stop="clearPreview"
                >
                  清除
                </button>
              </div>
            </template>
            <template v-else>
              <div class="flex items-center gap-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50">
                  <svg class="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="text-sm font-medium text-slate-700">
                    {{ isDragging ? '松开即可上传头像' : '点击选择图片，或拖拽到此处' }}
                  </p>
                  <p class="mt-1 text-xs text-slate-500">支持 JPG、PNG、GIF、WEBP，最大 5MB</p>
                </div>
              </div>
            </template>
          </div>
        </section>
      </div>

      <div class="mt-7 flex justify-end gap-3">
        <el-button class="btn-cancel" @click="closeModal">取消</el-button>
        <el-button type="primary" class="btn-confirm" :loading="isSaving" :disabled="!hasSelection" @click="saveAvatar">
          {{ isSaving ? '保存中...' : '保存' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/store/authStore';
import { getFullImageUrl } from '@/utils/common';
import { resolveLegacyAssetUrl, systemAvatarUrls } from '@/utils/assetUrls';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const authStore = useAuthStore();

const showModal = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const fileInput = ref<HTMLInputElement | null>(null);
const previewImage = ref<string | null>(null);
const selectedAvatar = ref<string | null>(null);
const selectedFileName = ref('');
const isSaving = ref(false);
const isDragging = ref(false);
const deletingAvatar = ref<string | null>(null);

const systemAvatars = systemAvatarUrls;

const isSystemAvatar = (avatar: string | null | undefined) =>
  typeof avatar === 'string' && (systemAvatarUrls.includes(avatar.trim()) || Boolean(resolveLegacyAssetUrl(avatar)));

const historyAvatars = computed(() => {
  const rawHistory = Array.isArray(authStore.user?.avatarHistory) ? authStore.user.avatarHistory : [];
  return rawHistory.filter(
    (avatar, index, list): avatar is string =>
      typeof avatar === 'string' &&
      avatar.trim().length > 0 &&
      !isSystemAvatar(avatar) &&
      list.indexOf(avatar) === index
  ).slice(0, 5);
});

const historyAvatarSlots = computed(() => {
  const avatars = [...historyAvatars.value];
  while (avatars.length < 5) {
    avatars.push(null as unknown as string);
  }
  return avatars;
});

const hasSelection = computed(() => previewImage.value || selectedAvatar.value);

const avatarButtonClass = (avatar: string) => [
  'avatar-item',
  selectedAvatar.value === avatar ? 'avatar-item-active' : 'avatar-item-idle',
];

const getAvatarUrl = (avatar: string) => getFullImageUrl(avatar) || avatar;

const resetState = () => {
  previewImage.value = null;
  selectedAvatar.value = authStore.user?.avatar || null;
  selectedFileName.value = '';
  isDragging.value = false;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

watch(
  () => props.modelValue,
  visible => {
    if (visible) {
      resetState();
    }
  }
);

const closeModal = () => {
  showModal.value = false;
  resetState();
};

const selectAvatar = (avatar: string) => {
  selectedAvatar.value = avatar;
  previewImage.value = null;
  selectedFileName.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const openFileSelector = () => {
  fileInput.value?.click();
};

const validateFile = (file: File) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    ElMessage.warning('只支持 JPEG、PNG、GIF、WEBP 格式的图片');
    return false;
  }

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过5MB');
    return false;
  }

  return true;
};

const applySelectedFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = event => {
    previewImage.value = event.target?.result as string;
    selectedAvatar.value = null;
    selectedFileName.value = file.name;
  };
  reader.readAsDataURL(file);
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files?.length) {
    return;
  }

  const file = target.files[0];
  if (!validateFile(file)) {
    return;
  }

  applySelectedFile(file);
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;

  const file = event.dataTransfer?.files?.[0];
  if (!file || !validateFile(file)) {
    return;
  }

  if (fileInput.value) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.value.files = dataTransfer.files;
  }

  applySelectedFile(file);
};

const clearPreview = () => {
  previewImage.value = null;
  selectedFileName.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const saveAvatar = async () => {
  if (!hasSelection.value) {
    return;
  }

  isSaving.value = true;
  try {
    if (previewImage.value && fileInput.value?.files?.length) {
      await authStore.uploadAvatar(fileInput.value.files[0]);
    } else if (selectedAvatar.value) {
      await authStore.updateProfile({ avatar: selectedAvatar.value });
    }

    await authStore.fetchProfile();
    closeModal();
    ElMessage.success('头像更新成功');
  } catch {
    ElMessage.error('保存失败，请重试');
  } finally {
    isSaving.value = false;
  }
};

const removeHistoryAvatar = async (avatar: string) => {
  if (deletingAvatar.value) {
    return;
  }

  deletingAvatar.value = avatar;
  try {
    await authStore.deleteAvatarHistoryItem(avatar);
    if (selectedAvatar.value === avatar) {
      selectedAvatar.value = authStore.user?.avatar || null;
    }
    ElMessage.success('历史头像已删除');
  } catch {
    ElMessage.error('删除失败，请重试');
  } finally {
    deletingAvatar.value = null;
  }
};
</script>

<style scoped>
.history-avatar-wrapper {
  position: relative;
  height: 52px;
  width: 52px;
}

.avatar-item,
.history-avatar-item {
  display: flex;
  height: 52px;
  width: 52px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.avatar-item-idle {
  border-color: #e2e8f0;
}

.avatar-item-idle:hover {
  border-color: #60a5fa;
  transform: translateY(-1px);
}

.avatar-item-active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
}

.history-avatar-placeholder {
  border-style: dashed;
  border-color: #dbe2ea;
  background: #f8fafc;
  cursor: default;
}

.history-avatar-delete {
  position: absolute;
  top: -5px;
  right: -5px;
  display: flex;
  height: 18px;
  width: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid #ffffff;
  background: #ef4444;
  color: #ffffff;
  font-size: 12px;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
  transition: background 0.2s ease;
}

.history-avatar-delete:hover {
  background: #dc2626;
}

.history-avatar-delete:disabled {
  cursor: not-allowed;
  background: #f87171;
}

.history-avatar-empty {
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: center;
}

.history-avatar-empty-text {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.upload-panel {
  cursor: pointer;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  padding: 18px 20px;
  transition: all 0.2s ease;
}

.upload-panel:hover,
.upload-panel-dragging {
  border-color: #60a5fa;
  background: #f8fbff;
}
</style>
