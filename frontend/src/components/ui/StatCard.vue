<template>
  <div :class="['stat-card', `stat-card--${type}`]">
    <div class="stat-card__bg"></div>
    <div class="stat-card__inner">
      <div class="stat-card__icon">
        <component :is="iconComponent" />
      </div>
      <div class="stat-card__body">
        <span class="stat-card__label">{{ label }}</span>
        <div class="stat-card__metric">
          <span class="stat-card__value">{{ value }}</span>
          <span v-if="subLabel" class="stat-card__sub-label">{{ subLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Document, Clock, CircleCheck, TrendCharts, User, Money, Box, Shop } from '@element-plus/icons-vue';

interface Props {
  /** 标题 */
  label: string;
  /** 数值 */
  value: string | number;
  /** 子标签（可选） */
  subLabel?: string;
  /** 类型：total(蓝色), pending(橙色), listed(绿色), growth(紫色), users(青色), money(金色), package(灰色), cart(红色) */
  type?: 'total' | 'pending' | 'listed' | 'growth' | 'users' | 'money' | 'package' | 'cart';
  /** 自定义图标组件（可选） */
  icon?: typeof Document;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'total',
});

// 根据类型选择图标
const iconComponent = computed(() => {
  if (props.icon) return props.icon;
  
  const iconMap: Record<string, typeof Document> = {
    total: Document,
    pending: Clock,
    listed: CircleCheck,
    growth: TrendCharts,
    users: User,
    money: Money,
    package: Box,
    cart: Shop,
  };
  
  return iconMap[props.type] || Document;
});
</script>

<style scoped>
.stat-card {
  position: relative;
  isolation: isolate;
  border-radius: 16px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 251, 255, 0.72)),
    linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(14, 165, 233, 0.02));
  border: 1px solid rgba(226, 232, 240, 0.78);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(10px);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  padding: clamp(10px, 0.85vw, 12px);
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(147, 197, 253, 0.86);
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.08);
}

.stat-card::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  pointer-events: none;
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.52), transparent),
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.82), transparent 30%);
  opacity: 0.56;
}

.stat-card::after {
  position: absolute;
  right: -44px;
  bottom: -54px;
  z-index: -1;
  width: 132px;
  height: 132px;
  content: '';
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.055);
  pointer-events: none;
}

/* 渐变背景装饰 */
.stat-card__bg {
  position: absolute;
  top: -52px;
  right: -38px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  opacity: 0.1;
  pointer-events: none;
  filter: blur(1px);
  animation: statCardHaloFloat 7.2s ease-in-out infinite;
}

.stat-card--total .stat-card__bg {
  background: linear-gradient(135deg, #409eff, #69c0ff);
}

.stat-card--pending .stat-card__bg {
  background: linear-gradient(135deg, #e6a23c, #f0c16e);
}

.stat-card--listed .stat-card__bg {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stat-card--growth .stat-card__bg {
  background: linear-gradient(135deg, #ef4444, #f87171);
}

.stat-card--users .stat-card__bg {
  background: linear-gradient(135deg, #06b6d4, #22d3ee);
}

.stat-card--money .stat-card__bg {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.stat-card--package .stat-card__bg {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
}

.stat-card--cart .stat-card__bg {
  background: linear-gradient(135deg, #ef4444, #f87171);
}

/* 内容区 */
.stat-card__inner {
  display: flex;
  align-items: center;
  gap: clamp(10px, 0.9vw, 14px);
  padding: clamp(14px, 1.05vw, 17px) clamp(14px, 1.12vw, 18px);
  position: relative;
  z-index: 1;
}

/* 图标容器 */
.stat-card__icon {
  position: relative;
  width: clamp(40px, 3vw, 46px);
  height: clamp(40px, 3vw, 46px);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  transition: transform 0.22s ease;
}

.stat-card:hover .stat-card__icon {
  transform: translateY(-1px) scale(1.02);
}

.stat-card__icon::after {
  position: absolute;
  inset: 7px;
  content: '';
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.24);
  transform: translate(-9px, -9px);
  opacity: 0;
  animation: statCardIconShine 4.8s ease-in-out infinite;
}

.stat-card__icon :deep(svg),
.stat-card__icon :deep(i),
.stat-card__icon :deep(.el-icon) {
  position: relative;
  z-index: 1;
  font-size: 24px !important;
  width: 24px !important;
  height: 24px !important;
  color: #fff;
}

.stat-card--total .stat-card__icon {
  background: linear-gradient(135deg, #409eff, #69c0ff);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
}

.stat-card--pending .stat-card__icon {
  background: linear-gradient(135deg, #e6a23c, #f0c16e);
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.35);
}

.stat-card--listed .stat-card__icon {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.35);
}

.stat-card--growth .stat-card__icon {
  background: linear-gradient(135deg, #ef4444, #f87171);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
}

.stat-card--users .stat-card__icon {
  background: linear-gradient(135deg, #06b6d4, #22d3ee);
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.35);
}

.stat-card--money .stat-card__icon {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
}

.stat-card--package .stat-card__icon {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
}

.stat-card--cart .stat-card__icon {
  background: linear-gradient(135deg, #ef4444, #f87171);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
}

/* 文字区 */
.stat-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  min-width: 0;
}

.stat-card__metric {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  min-width: 0;
}

.stat-card__label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  letter-spacing: 0;
  text-align: left;
}

.stat-card__value {
  font-size: clamp(18px, 1.24vw, 20px);
  font-weight: 850;
  line-height: 1.1;
  letter-spacing: 0;
}

.stat-card__sub-label {
  margin-bottom: 1px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
  line-height: 14px;
  white-space: nowrap;
}

.stat-card--total .stat-card__value {
  color: #2563eb;
}

.stat-card--pending .stat-card__value {
  color: #d97706;
}

.stat-card--listed .stat-card__value {
  color: #16a34a;
}

.stat-card--growth .stat-card__value {
  color: #dc2626;
}

.stat-card--users .stat-card__value {
  color: #0891b2;
}

.stat-card--money .stat-card__value {
  color: #d97706;
}

.stat-card--package .stat-card__value {
  color: #7c3aed;
}

.stat-card--cart .stat-card__value {
  color: #dc2626;
}

@keyframes statCardHaloFloat {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(-8px, 10px, 0) scale(1.05);
  }
}

@keyframes statCardIconShine {
  0%,
  72%,
  100% {
    transform: translate(-10px, -10px);
    opacity: 0;
  }

  84% {
    transform: translate(9px, 9px);
    opacity: 0.42;
  }
}

@media (max-width: 1400px) {
  .stat-card__inner {
    min-height: 68px;
  }

  .stat-card__label {
    font-size: 11.5px;
  }
}
</style>
