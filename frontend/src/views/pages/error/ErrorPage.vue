<template>
  <MainLayout>
    <div class="app-page error-page">
      <div class="app-page-surface error-scene">
        <div class="space-loader" aria-hidden="true">
          <div class="rocket">
            <span class="rocket-body"></span>
            <span class="rocket-window"></span>
            <span class="rocket-flame"></span>
          </div>
          <div class="moon">
            <span class="crater crater-1"></span>
            <span class="crater crater-2"></span>
            <span class="crater crater-3"></span>
            <span class="moon-eye eye-left"></span>
            <span class="moon-eye eye-right"></span>
            <span class="moon-mouth"></span>
          </div>
          <span class="star star-1"></span>
          <span class="star star-2"></span>
          <span class="star star-3"></span>
          <div class="loader-caption">
            <span>STATUS</span>
            <i></i>
            <i></i>
            <i></i>
          </div>
        </div>

        <div class="error-copy">
          <div class="error-code">{{ config.code }}</div>
          <h1 class="error-title">{{ config.title }}</h1>
          <p class="error-desc">{{ config.description }}</p>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MainLayout from '@/components/MainLayout.vue';

const props = defineProps<{
  code: '404' | '500' | '502';
}>();

const config = computed(() => {
  const map = {
    '404': {
      code: '404',
      title: '页面不存在',
      description: '当前访问的页面暂时无法找到，请确认入口是否有效或稍后再试。',
    },
    '500': {
      code: '500',
      title: '页面运行异常',
      description: '页面处理过程中遇到异常，系统正在记录问题，请稍后再试。',
    },
    '502': {
      code: '502',
      title: '模块加载失败',
      description: '页面资源暂时不可用，服务正在恢复中，请稍后重新进入。',
    },
  } as const;

  return map[props.code] || map['500'];
});
</script>

<style scoped>
.error-page {
  display: flex;
  align-items: stretch;
  justify-content: center;
  background: transparent;
}

.error-scene {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(360px, 0.92fr) minmax(360px, 1fr);
  align-items: center;
  justify-content: center;
  gap: clamp(44px, 7vw, 96px);
  padding: clamp(42px, 6vh, 72px) clamp(56px, 8vw, 120px);
  overflow: hidden;
  border-radius: 20px;
  color: #1e293b;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(239, 246, 255, 0.58)),
    radial-gradient(circle at 78% 70%, rgba(14, 165, 233, 0.10), transparent 42%);
  box-shadow:
    0 18px 44px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(8px);
}

.space-loader {
  position: relative;
  justify-self: end;
  width: min(360px, 100%);
  height: 320px;
  min-width: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 48%, rgba(59, 130, 246, 0.16) 0%, rgba(219, 234, 254, 0.46) 34%, rgba(219, 234, 254, 0.18) 56%, rgba(219, 234, 254, 0) 76%);
}

.moon {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%);
  box-shadow: inset -18px -16px 0 rgba(37, 99, 235, 0.16), 0 16px 30px rgba(59, 130, 246, 0.18);
}

.crater,
.moon-eye,
.moon-mouth,
.star,
.rocket span {
  position: absolute;
  display: block;
}

.crater {
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.16);
}

.crater-1 {
  width: 22px;
  height: 22px;
  left: 48px;
  top: 36px;
}

.crater-2 {
  width: 34px;
  height: 34px;
  right: 32px;
  bottom: 28px;
}

.crater-3 {
  width: 26px;
  height: 26px;
  left: 32px;
  bottom: 42px;
}

.moon-eye {
  width: 14px;
  height: 14px;
  top: 86px;
  border-radius: 50%;
  background: #0f172a;
}

.eye-left {
  left: 60px;
}

.eye-right {
  right: 58px;
}

.moon-mouth {
  left: 80px;
  top: 106px;
  width: 18px;
  height: 9px;
  border: 2px solid #0f172a;
  border-top: 0;
  border-radius: 0 0 12px 12px;
}

.rocket {
  position: absolute;
  left: 28%;
  top: 16%;
  width: 78px;
  height: 56px;
  transform: rotate(-28deg);
  animation: rocket-float 2.7s ease-in-out infinite;
}

.rocket-body {
  width: 60px;
  height: 32px;
  right: 0;
  top: 9px;
  border-radius: 18px 24px 24px 18px;
  background: #f8fafc;
}

.rocket-body::before,
.rocket-body::after {
  content: '';
  position: absolute;
  left: 4px;
  border-style: solid;
}

.rocket-body::before {
  top: -10px;
  border-width: 0 18px 17px 6px;
  border-color: transparent transparent #38bdf8 transparent;
}

.rocket-body::after {
  bottom: -10px;
  border-width: 17px 18px 0 6px;
  border-color: #38bdf8 transparent transparent transparent;
}

.rocket-window {
  right: 13px;
  top: 17px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #172554;
}

.rocket-flame {
  left: 0;
  top: 19px;
  width: 24px;
  height: 13px;
  border-radius: 999px 0 0 999px;
  background: linear-gradient(90deg, #fb923c, #fde68a);
}

.loader-caption {
  position: absolute;
  left: 50%;
  top: calc(50% + 112px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 24px;
  padding: 0 12px;
  border-radius: 999px;
  color: #2563eb;
  background: rgba(219, 234, 254, 0.46);
  border: 1px solid rgba(96, 165, 250, 0.18);
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.18em;
  transform: translateX(-50%);
}

.loader-caption span {
  animation: caption-glow 1.8s ease-in-out infinite;
}

.loader-caption i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #2563eb;
  opacity: 0.45;
  animation: dot-bounce 1.15s ease-in-out infinite;
}

.loader-caption i:nth-child(3) {
  animation-delay: 0.16s;
}

.loader-caption i:nth-child(4) {
  animation-delay: 0.32s;
}

.star {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #60a5fa;
  opacity: 0.8;
  animation: star-pulse 1.8s ease-in-out infinite;
}

.star-1 {
  left: 66%;
  top: 18%;
}

.star-2 {
  left: 77%;
  top: 24%;
  animation-delay: 0.35s;
}

.star-3 {
  left: 35%;
  top: 60%;
  animation-delay: 0.75s;
}

.error-copy {
  justify-self: start;
  text-align: left;
  min-width: 0;
}

.error-code {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  margin-bottom: 16px;
  border-radius: 999px;
  background: rgba(219, 234, 254, 0.58);
  color: #2563eb;
  border: 1px solid rgba(96, 165, 250, 0.26);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.error-title {
  margin: 0 0 14px;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.2;
  font-weight: 800;
}

.error-desc {
  margin: 0;
  color: #64748b;
  max-width: 360px;
  font-size: 14px;
  line-height: 1.8;
}

@keyframes rocket-float {
  0%, 100% {
    transform: translate(0, 0) rotate(-28deg);
  }
  50% {
    transform: translate(8px, -10px) rotate(-22deg);
  }
}

@keyframes star-pulse {
  0%, 100% {
    opacity: 0.35;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.25);
  }
}

@keyframes caption-glow {
  0%, 100% {
    opacity: 0.72;
  }
  50% {
    opacity: 1;
  }
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@media (max-width: 900px) {
  .error-scene {
    grid-template-columns: 1fr;
    padding: 26px 24px 30px;
    gap: 18px;
  }

  .space-loader {
    justify-self: center;
    width: 100%;
    height: 220px;
  }

  .error-copy {
    justify-self: center;
    text-align: center;
  }
}
</style>
