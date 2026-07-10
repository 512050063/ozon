<template>
  <div class="loading-spinner" :class="{ inline }">
    <div class="loading-dots">
      <span v-for="i in 3" :key="i" :style="{ animationDelay: (i - 1) * 0.2 + 's' }"></span>
    </div>
    <span v-if="text" class="loading-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  text?: string;
  inline?: boolean;
}
withDefaults(defineProps<Props>(), {
  text: '',
  inline: false
});
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.loading-spinner.inline {
  flex-direction: row;
  gap: 8px;
}

.loading-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4f46e5;
  display: inline-block;
  animation: load-dot-bounce 1.2s ease-in-out infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes load-dot-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.loading-text {
  font-size: 12px;
  color: #9ca3af;
}
</style>
