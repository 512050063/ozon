<template>
  <div
    class="app-image"
    :class="[
      `app-image--${state}`,
      { 'app-image--preview': preview, 'app-image--clickable': clickable },
    ]"
    @click="emit('click', $event)"
  >
    <el-image
      v-if="normalizedSrc"
      class="app-image-inner"
      :src="normalizedSrc"
      :alt="alt"
      :fit="fit"
      :lazy="lazy"
      :preview-src-list="preview ? normalizedPreviewList : undefined"
      :preview-teleported="previewTeleported"
      :initial-index="initialIndex"
      @load="state = 'loaded'"
      @error="state = 'error'"
    >
      <template #placeholder>
        <div class="app-image-fallback" aria-label="图片加载中">
          <el-icon class="app-image-fallback-icon"><Picture /></el-icon>
        </div>
      </template>
      <template #error>
        <div class="app-image-fallback" :aria-label="errorText">
          <el-icon class="app-image-fallback-icon"><Picture /></el-icon>
        </div>
      </template>
      <template #viewer-error>
        <div class="app-image-fallback" :aria-label="errorText">
          <el-icon class="app-image-fallback-icon"><Picture /></el-icon>
        </div>
      </template>
    </el-image>
    <div v-else class="app-image-fallback" :aria-label="emptyText">
      <el-icon class="app-image-fallback-icon"><Picture /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Picture } from '@element-plus/icons-vue';
import { toDisplayImageUrl } from '@/utils/imageUrl';

type ImageFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

interface Props {
  src?: string | null;
  alt?: string;
  fit?: ImageFit;
  lazy?: boolean;
  preview?: boolean;
  previewSrcList?: string[];
  previewTeleported?: boolean;
  initialIndex?: number;
  emptyText?: string;
  errorText?: string;
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  alt: '',
  fit: 'cover',
  lazy: false,
  preview: false,
  previewSrcList: () => [],
  previewTeleported: true,
  initialIndex: 0,
  emptyText: '暂无图片',
  errorText: '加载失败',
  clickable: false,
});

const emit = defineEmits<{
  (event: 'click', payload: MouseEvent): void;
}>();

const state = ref<'empty' | 'loading' | 'loaded' | 'error'>(props.src ? 'loading' : 'empty');

const normalizedSrc = computed(() => {
  const value = `${props.src || ''}`.trim();
  return toDisplayImageUrl(value);
});

const normalizedPreviewList = computed(() => {
  const list = props.previewSrcList.length > 0 ? props.previewSrcList : [normalizedSrc.value];
  return list.filter(Boolean);
});

watch(
  () => normalizedSrc.value,
  value => {
    state.value = value ? 'loading' : 'empty';
  }
);
</script>

<style scoped>
.app-image {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: block;
  overflow: hidden;
  background: #f6f8fb;
}

.app-image-inner {
  width: 100%;
  height: 100%;
  display: block;
}

.app-image--clickable {
  cursor: pointer;
}

.app-image-fallback {
  width: 100%;
  height: 100%;
  min-height: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: inherit;
  color: #b6c2d2;
  box-shadow: inset 0 0 0 1px rgba(203, 213, 225, 0.28);
  background:
    radial-gradient(circle at 52% 42%, rgba(255, 255, 255, 0.72) 0 22%, transparent 23%),
    linear-gradient(145deg, #f8fafc, #eef3f8);
}

.app-image-fallback-icon {
  width: 34%;
  height: 34%;
  max-width: 40px;
  max-height: 40px;
  min-width: 14px;
  min-height: 14px;
  font-size: 1px;
  color: #b8c4d3;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.85));
}

.app-image-fallback-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
