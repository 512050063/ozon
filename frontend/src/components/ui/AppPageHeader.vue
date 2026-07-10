<template>
  <div class="app-page-header">
    <div class="header-content">
      <div class="header-left">
        <!-- 图标区域：支持 slot 或 iconSrc -->
        <div v-if="$slots.icon || iconSrc" class="header-icon">
          <slot name="icon">
            <img v-if="iconSrc" :src="iconSrc" :alt="title" class="header-icon-img" />
          </slot>
        </div>
        <div class="header-title-wrapper">
          <h3 class="header-title">{{ title }}</h3>
          <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <slot name="extra"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  subtitle?: string;
  iconSrc?: string;
}

defineProps<Props>();
</script>

<style scoped>
/* 页面标题样式 - 与定价策略页一致 */
.app-page-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(to right, #ffffff, #f8fafc);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15);
}

.header-icon-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.header-title-wrapper {
  text-align: left;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.header-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}
</style>
