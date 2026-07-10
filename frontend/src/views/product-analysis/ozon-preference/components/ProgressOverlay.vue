<template>
  <div v-if="isLoading" class="progress-overlay">
    <div class="progress-card">
      <div class="falcon-loader" aria-hidden="true">
        <div class="falcon-ring ring-one"></div>
        <div class="falcon-ring ring-two"></div>
        <div class="falcon-core"></div>
      </div>

      <div class="polling-status" aria-live="polite">
        <span class="polling-orbit" aria-hidden="true">
          <span class="polling-dot dot-one"></span>
          <span class="polling-dot dot-two"></span>
          <span class="polling-dot dot-three"></span>
        </span>
        <span class="polling-stage">阶段 {{ activeStageIndex + 1 }}/{{ stages.length }} · {{ activeStageTitle }}</span>
      </div>

      <div class="progress-copy">
        <p class="progress-subtitle">{{ subtitle }}</p>
      </div>

      <div class="progress-track skill-box" aria-live="polite">
        <div class="skill-bar">
          <div class="progress-fill skill-per" :style="{ width: normalizedProgress + '%' }">
            <span class="progress-water" aria-hidden="true"></span>
          </div>
          <span class="progress-bubble" :style="{ left: bubblePosition }">{{ normalizedProgress }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getSearchProgressCopy, type SearchProgressStage } from '../searchProgressState';

interface Props {
  isLoading: boolean;
  progress: number;
  stage?: SearchProgressStage;
  title?: string;
  subtitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  progress: 0,
  stage: 'startup',
  title: '获取数据',
  subtitle: '正在从 Ozon 拉取商品列表...',
});

const normalizedProgress = computed(() => Math.max(0, Math.min(100, Math.round(props.progress || 0))));
const bubblePosition = computed(() => `clamp(22px, ${normalizedProgress.value}%, calc(100% - 22px))`);
const stages: SearchProgressStage[] = ['startup', 'environment', 'fetching', 'parsing', 'extracting'];
const activeStageIndex = computed(() => Math.max(0, stages.indexOf(props.stage)));
const activeStageTitle = computed(() => getSearchProgressCopy(props.stage).title);
</script>

<style scoped>
.progress-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 440px;
  padding-top: 120px;
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(0.5px);
}

.progress-card {
  width: min(560px, calc(100% - 48px));
  text-align: center;
}

.falcon-loader {
  position: relative;
  width: 78px;
  height: 78px;
  margin: 0 auto 16px;
}

.falcon-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
}

.ring-one {
  border-top-color: #2563eb;
  border-right-color: rgba(37, 99, 235, 0.2);
  animation: falcon-spin 1.1s linear infinite;
}

.ring-two {
  inset: 12px;
  border-bottom-color: #60a5fa;
  border-left-color: rgba(96, 165, 250, 0.24);
  animation: falcon-spin 1.55s linear infinite reverse;
}

.falcon-core {
  position: absolute;
  inset: 28px;
  border-radius: 50%;
  background: #2563eb;
  box-shadow:
    0 0 0 8px rgba(37, 99, 235, 0.08),
    0 0 22px rgba(37, 99, 235, 0.28);
  animation: falcon-pulse 1.2s ease-in-out infinite;
}

.progress-subtitle {
  margin: 12px 0 0;
  color: #64748b;
  font-size: 14px;
}

.polling-status {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  gap: 8px;
  margin-top: 18px;
  padding: 8px 14px;
  overflow: hidden;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(219, 234, 254, 0), rgba(219, 234, 254, 0.86), rgba(219, 234, 254, 0)) 0 0 / 42% 100% no-repeat,
    rgba(248, 250, 252, 0.9);
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.74);
  animation: polling-sweep 1.8s ease-in-out infinite;
}

.polling-orbit {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 34px;
  height: 14px;
  flex: 0 0 34px;
}

.polling-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  animation: polling-dot 0.9s ease-in-out infinite;
}

.dot-two {
  animation-delay: 0.15s;
}

.dot-three {
  animation-delay: 0.3s;
}

.polling-stage {
  position: relative;
  z-index: 1;
  color: #1d4ed8;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-track {
  width: min(480px, 100%);
  margin: 30px auto 0;
  text-align: left;
}

.skill-bar {
  position: relative;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: #dbe1ea;
  box-shadow:
    inset 0 1px 2px rgba(15, 23, 42, 0.1),
    0 12px 24px rgba(37, 99, 235, 0.08);
}

.progress-fill {
  position: relative;
  display: block;
  height: 100%;
  border-radius: 999px;
  overflow: hidden;
  background: linear-gradient(180deg, #5d87ff 0%, #3f73f6 58%, #2f5fe8 100%);
  transition: width 0.3s ease;
  animation: progress-pulse 1.65s ease-in-out infinite;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -5px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.62) 0 18%, rgba(255, 255, 255, 0.24) 42%, transparent 70%);
  transform: translateY(-50%);
  animation: progress-tip-pulse 1.65s ease-in-out infinite;
  pointer-events: none;
}

.progress-water {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.progress-water::before,
.progress-water::after {
  content: '';
  position: absolute;
  left: -8%;
  width: 116%;
  height: 20px;
  border-radius: 48%;
  background: rgba(255, 255, 255, 0.34);
}

.progress-water::before {
  top: -14px;
  animation: progress-water-breathe 1.65s ease-in-out infinite;
}

.progress-water::after {
  top: -12px;
  border-radius: 52%;
  background: rgba(255, 255, 255, 0.18);
  animation: progress-water-breathe 1.65s ease-in-out infinite reverse;
}

.progress-bubble {
  position: absolute;
  top: -34px;
  z-index: 2;
  min-width: 40px;
  padding: 5px 8px;
  border-radius: 4px;
  background: #3f73f6;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  transform: translateX(-50%);
  box-shadow: 0 8px 18px rgba(63, 115, 246, 0.25);
}

.progress-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 10px;
  height: 10px;
  background: #3f73f6;
  transform: translateX(-50%) rotate(45deg);
}

@keyframes falcon-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes falcon-pulse {
  0%, 100% {
    transform: scale(0.84);
    opacity: 0.72;
  }

  50% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes polling-dot {
  0%, 80%, 100% {
    transform: translateY(0) scale(0.82);
    opacity: 0.48;
  }

  40% {
    transform: translateY(-4px) scale(1.12);
    opacity: 1;
  }
}

@keyframes polling-sweep {
  0% {
    background-position: -42% 0, 0 0;
  }

  100% {
    background-position: 142% 0, 0 0;
  }
}

@keyframes progress-pulse {
  0%, 100% {
    filter: saturate(1) brightness(1);
    box-shadow: inset 0 0 0 rgba(255, 255, 255, 0);
  }

  50% {
    filter: saturate(1.08) brightness(1.08);
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.2);
  }
}

@keyframes progress-water-breathe {
  0%, 100% {
    opacity: 0.54;
    transform: translateY(0) scaleX(1);
  }

  50% {
    opacity: 0.82;
    transform: translateY(2px) scaleX(1.03);
  }
}

@keyframes progress-tip-pulse {
  0%, 100% {
    opacity: 0.36;
    transform: translateY(-50%) scale(0.84);
  }

  50% {
    opacity: 0.8;
    transform: translateY(-50%) scale(1.06);
  }
}

</style>
