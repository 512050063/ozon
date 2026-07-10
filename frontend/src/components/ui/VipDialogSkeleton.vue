<template>
  <div class="vip-dialog-skeleton" aria-hidden="true">
    <section class="vip-skeleton-current">
      <div class="vip-skeleton-current-main">
        <span class="vip-skeleton-icon"></span>
        <div class="vip-skeleton-copy">
          <span class="vip-skeleton-line vip-skeleton-line--title"></span>
          <span class="vip-skeleton-line vip-skeleton-line--sub"></span>
        </div>
      </div>
      <span class="vip-skeleton-link"></span>
    </section>

    <section class="vip-skeleton-plans">
      <article
        v-for="item in 4"
        :key="item"
        class="vip-skeleton-card"
        :style="{ animationDelay: `${(item - 1) * 0.06}s` }"
      >
        <div class="vip-skeleton-card-head">
          <div class="vip-skeleton-plan-visual">
            <span class="vip-skeleton-plan-icon"></span>
            <span class="vip-skeleton-line vip-skeleton-line--name"></span>
          </div>
          <span class="vip-skeleton-line vip-skeleton-line--price"></span>
        </div>

        <div class="vip-skeleton-features">
          <div v-for="row in item === 1 ? 3 : 4" :key="row" class="vip-skeleton-feature">
            <span class="vip-skeleton-dot"></span>
            <span
              class="vip-skeleton-line vip-skeleton-line--feature"
              :class="`vip-skeleton-line--feature-${((item + row) % 3) + 1}`"
            ></span>
          </div>
        </div>

        <span class="vip-skeleton-button"></span>
      </article>
    </section>
  </div>
</template>

<style scoped>
.vip-dialog-skeleton {
  min-height: 468px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vip-skeleton-current {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(239, 246, 255, 0.72));
}

.vip-skeleton-current-main,
.vip-skeleton-feature {
  display: flex;
  align-items: center;
}

.vip-skeleton-current-main {
  min-width: 0;
  gap: 12px;
}

.vip-skeleton-copy,
.vip-skeleton-features {
  display: flex;
  flex-direction: column;
}

.vip-skeleton-copy {
  gap: 9px;
  min-width: 0;
}

.vip-skeleton-plans {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.vip-skeleton-card {
  min-height: 380px;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.72);
  opacity: 0;
  animation: vip-skeleton-enter 0.26s ease forwards;
}

.vip-skeleton-card-head {
  min-height: 92px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  padding: 12px;
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.86));
}

.vip-skeleton-plan-visual {
  display: flex;
  align-items: center;
  gap: 9px;
}

.vip-skeleton-features {
  gap: 12px;
  padding: 18px 4px 16px;
  flex: 1;
}

.vip-skeleton-feature {
  gap: 8px;
}

.vip-skeleton-icon,
.vip-skeleton-plan-icon,
.vip-skeleton-line,
.vip-skeleton-link,
.vip-skeleton-dot,
.vip-skeleton-button {
  position: relative;
  overflow: hidden;
  display: block;
  background: #eef3f9;
}

.vip-skeleton-icon::after,
.vip-skeleton-plan-icon::after,
.vip-skeleton-line::after,
.vip-skeleton-link::after,
.vip-skeleton-dot::after,
.vip-skeleton-button::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.74), transparent);
  animation: vip-skeleton-shimmer 1.45s infinite;
}

.vip-skeleton-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border-radius: 12px;
}

.vip-skeleton-plan-icon {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 9px;
}

.vip-skeleton-line {
  height: 13px;
  border-radius: 999px;
}

.vip-skeleton-line--title {
  width: 176px;
  height: 15px;
}

.vip-skeleton-line--sub {
  width: 128px;
  height: 12px;
}

.vip-skeleton-line--name {
  width: 58px;
  height: 14px;
}

.vip-skeleton-line--price {
  width: 86px;
  height: 24px;
  border-radius: 8px;
}

.vip-skeleton-line--feature {
  height: 12px;
}

.vip-skeleton-line--feature-1 {
  width: 72%;
}

.vip-skeleton-line--feature-2 {
  width: 88%;
}

.vip-skeleton-line--feature-3 {
  width: 58%;
}

.vip-skeleton-link {
  width: 58px;
  height: 18px;
  flex: 0 0 58px;
  border-radius: 999px;
}

.vip-skeleton-dot {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  border-radius: 999px;
}

.vip-skeleton-button {
  height: 34px;
  border-radius: 9px;
}

@keyframes vip-skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

@keyframes vip-skeleton-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .vip-skeleton-plans {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
