<template>
  <Teleport to="body">
    <transition name="app-update-progress-fade">
      <div v-if="visible" class="app-update-progress-shell" :class="{ 'is-global': isGlobal }">
        <div class="app-update-progress-card">
          <div class="app-update-progress-row">
            <div class="app-update-progress-orb" aria-hidden="true">
              <span></span>
            </div>
            <small class="app-update-progress-message" :title="displayMessage">{{ displayMessage }}</small>
            <div class="app-update-progress-track">
              <span class="app-update-progress-fill" :style="{ width: `${normalizedProgress}%` }"></span>
            </div>
            <div class="app-update-progress-percent">{{ normalizedProgress }}%</div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  visible: boolean;
  title: string;
  progress: number;
  message: string;
  progressText: string;
  isGlobal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '正在更新',
  progress: 0,
  message: '',
  progressText: '',
  isGlobal: false,
});

const normalizedProgress = computed(() => Math.max(0, Math.min(100, Math.round(props.progress || 0))));
const displayMessage = computed(() => props.progressText || props.title || props.message || '正在更新');
</script>

<style scoped>
.app-update-progress-shell {
  position: fixed;
  top: 76px;
  right: 20px;
  left: 260px;
  z-index: 3200;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0;
  pointer-events: none;
}

.app-update-progress-shell.is-global {
  align-items: flex-start;
}

.app-update-progress-card {
  width: min(430px, calc(100% - 32px));
  padding: 12px 18px;
  border-radius: 14px;
  border: 1px solid rgba(191, 219, 254, 0.88);
  background: #ffffff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(59, 130, 246, 0.08);
  backdrop-filter: blur(10px);
  pointer-events: auto;
}

.app-update-progress-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.app-update-progress-orb {
  position: relative;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88), 0 9px 18px rgba(59, 130, 246, 0.16);
}

.app-update-progress-orb::before {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  border: 2px solid rgba(37, 99, 235, 0.22);
  border-top-color: #2563eb;
  animation: updateProgressSpin 1.2s linear infinite;
}

.app-update-progress-orb span {
  position: absolute;
  right: 7px;
  bottom: 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22d3ee;
  box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.16);
}

.app-update-progress-message {
  flex: 0 0 auto;
  max-width: 112px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  color: #334155;
}

.app-update-progress-track {
  flex: 1 1 190px;
  max-width: 240px;
  min-width: 150px;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);
}

.app-update-progress-fill {
  position: relative;
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #60a5fa, #22d3ee, #2563eb);
  box-shadow: 0 0 18px rgba(59, 130, 246, 0.26);
  transition: width 0.22s ease;
  overflow: hidden;
}

.app-update-progress-fill::after {
  content: "";
  position: absolute;
  inset: 0;
  width: 46%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
  animation: updateProgressShine 1.7s ease-in-out infinite;
}

.app-update-progress-percent {
  flex: 0 0 40px;
  text-align: right;
  font-size: 14px;
  line-height: 18px;
  color: #2563eb;
  font-weight: 800;
}

.app-update-progress-fade-enter-active,
.app-update-progress-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.app-update-progress-fade-enter-from,
.app-update-progress-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes updateProgressSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes updateProgressShine {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(240%);
  }
}
</style>
