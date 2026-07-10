<template>
  <div class="app-skeleton" :class="[`app-skeleton--${variant}`, { 'app-skeleton--compact': compact }]">
    <template v-if="variant === 'finance'">
      <div class="app-skeleton-finance-head">
        <span class="app-skeleton-block app-skeleton-block--label"></span>
        <span class="app-skeleton-block app-skeleton-block--button"></span>
      </div>
      <div class="app-skeleton-finance-grid">
        <div class="app-skeleton-finance-card app-skeleton-finance-card--wide">
          <span class="app-skeleton-block app-skeleton-block--sm app-skeleton-delay-1"></span>
          <span class="app-skeleton-block app-skeleton-block--title app-skeleton-delay-2"></span>
          <span class="app-skeleton-block app-skeleton-block--line app-skeleton-delay-3"></span>
          <span class="app-skeleton-block app-skeleton-block--line app-skeleton-delay-4"></span>
          <span class="app-skeleton-block app-skeleton-block--short app-skeleton-delay-5"></span>
        </div>
        <div class="app-skeleton-finance-card">
          <span class="app-skeleton-block app-skeleton-block--sm app-skeleton-delay-1"></span>
          <span class="app-skeleton-block app-skeleton-block--title app-skeleton-delay-2"></span>
          <span v-for="item in 5" :key="`left-${item}`" class="app-skeleton-block app-skeleton-block--line" :class="`app-skeleton-delay-${Math.min(item + 2, 6)}`"></span>
        </div>
        <div class="app-skeleton-finance-card">
          <span class="app-skeleton-block app-skeleton-block--sm app-skeleton-delay-1"></span>
          <span class="app-skeleton-block app-skeleton-block--title app-skeleton-delay-2"></span>
          <span v-for="item in 5" :key="`right-${item}`" class="app-skeleton-block app-skeleton-block--line" :class="`app-skeleton-delay-${Math.min(item + 2, 6)}`"></span>
        </div>
      </div>
    </template>

    <template v-else-if="variant === 'product-table'">
      <div
        v-for="row in rows"
        :key="`product-${row}`"
        class="app-skeleton-dom-row app-skeleton-product-row"
        :style="{ animationDelay: `${(row - 1) * 0.07}s` }"
      >
        <span class="app-skeleton-line app-skeleton-line--index"></span>
        <span class="app-skeleton-image"></span>
        <div class="app-skeleton-stack">
          <span class="app-skeleton-line app-skeleton-line--mono app-skeleton-cell--2"></span>
          <span class="app-skeleton-line app-skeleton-line--mono app-skeleton-cell--4"></span>
        </div>
        <div class="app-skeleton-stack">
          <span class="app-skeleton-line app-skeleton-line--text app-skeleton-cell--3"></span>
          <span class="app-skeleton-line app-skeleton-line--muted app-skeleton-cell--5"></span>
        </div>
        <div class="app-skeleton-stack app-skeleton-stack--start">
          <span class="app-skeleton-line app-skeleton-line--tag"></span>
          <span class="app-skeleton-line app-skeleton-line--tiny app-skeleton-cell--4"></span>
        </div>
        <div class="app-skeleton-stack app-skeleton-stack--end">
          <span class="app-skeleton-line app-skeleton-line--price"></span>
          <span class="app-skeleton-line app-skeleton-line--pill"></span>
        </div>
        <span class="app-skeleton-line app-skeleton-line--stock"></span>
        <div class="app-skeleton-stack app-skeleton-stack--end">
          <span class="app-skeleton-line app-skeleton-line--date"></span>
          <span class="app-skeleton-line app-skeleton-line--time"></span>
        </div>
        <div class="app-skeleton-actions">
          <span class="app-skeleton-action app-skeleton-action--primary"></span>
          <span class="app-skeleton-action"></span>
        </div>
      </div>
    </template>

    <template v-else-if="variant === 'order-table'">
      <div
        v-for="row in rows"
        :key="`order-${row}`"
        class="app-skeleton-dom-row app-skeleton-order-row"
        :style="{ animationDelay: `${(row - 1) * 0.07}s` }"
      >
        <span class="app-skeleton-line app-skeleton-line--index"></span>
        <span class="app-skeleton-line app-skeleton-line--mono app-skeleton-cell--3"></span>
        <span class="app-skeleton-line app-skeleton-line--tag"></span>
        <span class="app-skeleton-image app-skeleton-image--sm"></span>
        <div class="app-skeleton-stack">
          <span class="app-skeleton-line app-skeleton-line--text app-skeleton-cell--2"></span>
          <span class="app-skeleton-line app-skeleton-line--muted app-skeleton-cell--4"></span>
        </div>
        <span class="app-skeleton-line app-skeleton-line--price"></span>
        <span class="app-skeleton-line app-skeleton-line--date app-skeleton-cell--5"></span>
        <span class="app-skeleton-action app-skeleton-action--primary"></span>
      </div>
    </template>

    <template v-else-if="variant === 'finance-table'">
      <div
        v-for="row in rows"
        :key="`finance-${row}`"
        class="app-skeleton-dom-row app-skeleton-finance-row"
        :style="{ animationDelay: `${(row - 1) * 0.07}s` }"
      >
        <span class="app-skeleton-line app-skeleton-line--index"></span>
        <span class="app-skeleton-expand"></span>
        <span class="app-skeleton-line app-skeleton-line--mono app-skeleton-cell--4"></span>
        <div class="app-skeleton-stack">
          <span class="app-skeleton-line app-skeleton-line--text app-skeleton-cell--3"></span>
          <span class="app-skeleton-line app-skeleton-line--muted app-skeleton-cell--5"></span>
        </div>
        <span class="app-skeleton-line app-skeleton-line--tag app-skeleton-cell--2"></span>
        <span class="app-skeleton-line app-skeleton-line--text app-skeleton-cell--4"></span>
        <span class="app-skeleton-line app-skeleton-line--date"></span>
        <span class="app-skeleton-line app-skeleton-line--amount"></span>
      </div>
    </template>

    <template v-else-if="variant === 'table'">
      <div
        v-for="row in rows"
        :key="`table-${row}`"
        class="app-skeleton-dom-row app-skeleton-generic-table-row"
        :style="{ gridTemplateColumns: tableGridTemplate, animationDelay: `${(row - 1) * 0.07}s` }"
      >
        <template v-for="col in normalizedColumns" :key="`row-${row}-col-${col}`">
          <span
            v-if="isTableImageCell(col)"
            class="app-skeleton-image app-skeleton-image--sm"
            :class="`app-skeleton-cell--${((row + col) % 5) + 1}`"
          ></span>
          <div v-else-if="isTableStackCell(col)" class="app-skeleton-stack">
            <span class="app-skeleton-line app-skeleton-line--text" :class="`app-skeleton-cell--${((row + col) % 5) + 1}`"></span>
            <span class="app-skeleton-line app-skeleton-line--muted" :class="`app-skeleton-cell--${((row + col + 2) % 5) + 1}`"></span>
          </div>
          <div v-else-if="isTableActionCell(col)" class="app-skeleton-actions">
            <span class="app-skeleton-action app-skeleton-action--primary"></span>
            <span class="app-skeleton-action"></span>
          </div>
          <span
            v-else
            class="app-skeleton-line"
            :class="getTableCellClass(row, col)"
          ></span>
        </template>
      </div>
    </template>

    <template v-else-if="variant === 'dialog' || variant === 'drawer' || variant === 'form'">
      <div class="app-skeleton-fields">
        <div v-if="showAvatar" class="app-skeleton-form-head">
          <span class="app-skeleton-avatar"></span>
          <div class="app-skeleton-stack">
            <span class="app-skeleton-line app-skeleton-line--text app-skeleton-cell--2"></span>
            <span class="app-skeleton-line app-skeleton-line--muted app-skeleton-cell--4"></span>
          </div>
        </div>
        <div
          v-for="row in rows"
          :key="`${variant}-${row}`"
          class="app-skeleton-field-row"
          :class="{
            'app-skeleton-field-row--textarea': isTextareaRow(row),
            'app-skeleton-field-row--inline': variant === 'dialog' && row % 3 === 0,
          }"
          :style="{ animationDelay: `${(row - 1) * 0.07}s` }"
        >
          <span class="app-skeleton-line app-skeleton-field-label" :class="`app-skeleton-cell--${((row + 1) % 5) + 1}`"></span>
          <div class="app-skeleton-field-control" :class="getFieldControlClass(row)">
            <span v-if="row % 2 === 0" class="app-skeleton-field-icon"></span>
            <span class="app-skeleton-line app-skeleton-field-value" :class="`app-skeleton-cell--${((row + 3) % 5) + 1}`"></span>
            <span v-if="row % 3 === 0" class="app-skeleton-field-addon"></span>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="variant === 'card'">
      <div class="app-skeleton-card-list">
        <div
          v-for="row in rows"
          :key="`card-${row}`"
          class="app-skeleton-card-row"
          :style="{ animationDelay: `${(row - 1) * 0.07}s` }"
        >
          <span class="app-skeleton-image"></span>
          <div class="app-skeleton-card-body">
            <span class="app-skeleton-line app-skeleton-line--text" :class="`app-skeleton-cell--${((row + 1) % 5) + 1}`"></span>
            <div class="app-skeleton-card-tags">
              <span class="app-skeleton-line app-skeleton-line--tag"></span>
              <span class="app-skeleton-line app-skeleton-line--pill"></span>
            </div>
            <span class="app-skeleton-line app-skeleton-line--muted" :class="`app-skeleton-cell--${((row + 4) % 5) + 1}`"></span>
          </div>
          <span class="app-skeleton-action app-skeleton-action--primary"></span>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        v-for="row in rows"
        :key="row"
        class="app-skeleton-row"
        :style="{ animationDelay: `${(row - 1) * 0.07}s` }"
      >
        <div v-if="showAvatar && row === 1" class="app-skeleton-avatar"></div>
        <div class="app-skeleton-content">
          <div class="app-skeleton-line app-skeleton-line--sm"></div>
          <div class="app-skeleton-line app-skeleton-line--lg"></div>
          <div class="app-skeleton-line app-skeleton-line--md"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  rows?: number;
  columns?: number;
  variant?: 'form' | 'table' | 'dialog' | 'drawer' | 'card' | 'finance' | 'product-table' | 'order-table' | 'finance-table';
  compact?: boolean;
  showAvatar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  rows: 4,
  columns: 5,
  variant: 'form',
  compact: false,
  showAvatar: false,
});

const normalizedColumns = computed(() => Math.max(1, Math.min(12, props.columns)));
const tableGridTemplate = computed(() => {
  if (normalizedColumns.value >= 9) {
    return '44px 64px minmax(130px, 1fr) minmax(180px, 1.4fr) 112px 140px 72px 116px 96px';
  }
  if (normalizedColumns.value === 8) {
    return '44px 96px 112px 64px minmax(180px, 1.4fr) 112px 116px 96px';
  }
  if (normalizedColumns.value === 4) {
    return '64px minmax(180px, 1.5fr) 112px 86px';
  }
  const templates: string[] = [];
  for (let index = 1; index <= normalizedColumns.value; index += 1) {
    if (index === 1) {
      templates.push('44px');
    } else if (index === 2) {
      templates.push('minmax(56px, 0.55fr)');
    } else if (index === normalizedColumns.value) {
      templates.push('minmax(72px, 0.75fr)');
    } else if (index === 4) {
      templates.push('minmax(180px, 1.8fr)');
    } else {
      templates.push('minmax(92px, 1fr)');
    }
  }
  return templates.join(' ');
});

function getTableCellClass(row: number, column: number) {
  const lengthClass = `app-skeleton-cell--${((row + column) % 5) + 1}`;
  if (column === 1) return 'app-skeleton-line--index';
  if (column === normalizedColumns.value) return `app-skeleton-line--badge ${lengthClass}`;
  if (column % 4 === 0) return `app-skeleton-line--lg ${lengthClass}`;
  if (column % 3 === 0) return `app-skeleton-line--sm ${lengthClass}`;
  return `app-skeleton-line--md ${lengthClass}`;
}

function isTableImageCell(column: number) {
  return normalizedColumns.value >= 4 && column === 2;
}

function isTableStackCell(column: number) {
  if (normalizedColumns.value <= 4) return column === 3;
  return column === 4 || column === Math.max(3, normalizedColumns.value - 2);
}

function isTableActionCell(column: number) {
  return normalizedColumns.value >= 4 && column === normalizedColumns.value;
}

function isTextareaRow(row: number) {
  if (props.variant === 'dialog') return row === props.rows;
  if (props.variant === 'drawer') return row % 4 === 0;
  return row % 5 === 0;
}

function getFieldControlClass(row: number) {
  return {
    'app-skeleton-field-control--short': row % 4 === 1,
    'app-skeleton-field-control--textarea': isTextareaRow(row),
  };
}
</script>

<style scoped>
.app-skeleton {
  --app-skeleton-bg: #eef3f9;
  --app-skeleton-highlight: rgba(255, 255, 255, 0.72);
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}

.app-skeleton--compact {
  gap: 10px;
}

.app-skeleton-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 54px;
  opacity: 0;
  animation: app-skeleton-enter 0.26s ease forwards;
}

.app-skeleton--table .app-skeleton-row {
  min-width: 760px;
  min-height: 56px;
  padding: 8px 0;
}

.app-skeleton-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.app-skeleton-avatar,
.app-skeleton-line,
.app-skeleton-side,
.app-skeleton-block,
.app-skeleton-image,
.app-skeleton-action,
.app-skeleton-expand,
.app-skeleton-field-icon,
.app-skeleton-field-addon {
  position: relative;
  overflow: hidden;
  background: var(--app-skeleton-bg);
}

.app-skeleton-avatar::after,
.app-skeleton-line::after,
.app-skeleton-side::after,
.app-skeleton-block::after,
.app-skeleton-image::after,
.app-skeleton-action::after,
.app-skeleton-expand::after,
.app-skeleton-field-icon::after,
.app-skeleton-field-addon::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--app-skeleton-highlight), transparent);
  animation: app-skeleton-shimmer 1.45s infinite;
}

.app-skeleton-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  flex: 0 0 auto;
}

.app-skeleton-line {
  height: 14px;
  border-radius: 8px;
}

.app-skeleton-line--sm {
  width: 28%;
}

.app-skeleton-line--md {
  width: 58%;
}

.app-skeleton-line--lg {
  width: 100%;
  height: 18px;
}

.app-skeleton-line--index {
  width: 32px;
  flex: 0 0 32px;
}

.app-skeleton-line--badge {
  width: 76px;
  height: 20px;
  flex: 0 0 76px;
}

.app-skeleton-side {
  width: 74px;
  height: 26px;
  border-radius: 8px;
  flex: 0 0 auto;
}

.app-skeleton--dialog .app-skeleton-row {
  min-height: 48px;
}

.app-skeleton--dialog .app-skeleton-line--lg {
  width: 88%;
}

.app-skeleton--drawer .app-skeleton-row,
.app-skeleton--card .app-skeleton-row {
  min-height: 58px;
}

.app-skeleton-table-row {
  display: grid;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-width: max-content;
}

.app-skeleton-table-row .app-skeleton-line {
  width: 100%;
  max-width: 100%;
  align-self: center;
}

.app-skeleton-table-row .app-skeleton-cell--1 {
  width: 92%;
}

.app-skeleton-table-row .app-skeleton-cell--2 {
  width: 76%;
}

.app-skeleton-table-row .app-skeleton-cell--3 {
  width: 100%;
}

.app-skeleton-table-row .app-skeleton-cell--4 {
  width: 64%;
}

.app-skeleton-table-row .app-skeleton-cell--5 {
  width: 84%;
}

.app-skeleton-dom-row {
  display: grid;
  align-items: center;
  gap: 16px;
  min-width: max-content;
  min-height: 64px;
  padding: 8px 0;
  opacity: 0;
  animation: app-skeleton-enter 0.26s ease forwards;
}

.app-skeleton-product-row {
  grid-template-columns: 44px 64px minmax(130px, 1fr) minmax(180px, 1.4fr) 112px 140px 72px 116px 96px;
}

.app-skeleton-order-row {
  grid-template-columns: 44px 126px 96px 64px minmax(220px, 1.5fr) 92px 136px 72px;
}

.app-skeleton-finance-row {
  grid-template-columns: 44px 32px 140px minmax(220px, 1.5fr) 128px 156px 120px 96px;
}

.app-skeleton-generic-table-row {
  min-height: 58px;
  padding: 7px 0;
}

.app-skeleton-generic-table-row .app-skeleton-line {
  max-width: 100%;
  align-self: center;
}

.app-skeleton-generic-table-row .app-skeleton-cell--1,
.app-skeleton-fields .app-skeleton-cell--1,
.app-skeleton-card-list .app-skeleton-cell--1 {
  width: 92%;
}

.app-skeleton-generic-table-row .app-skeleton-cell--2,
.app-skeleton-fields .app-skeleton-cell--2,
.app-skeleton-card-list .app-skeleton-cell--2 {
  width: 76%;
}

.app-skeleton-generic-table-row .app-skeleton-cell--3,
.app-skeleton-fields .app-skeleton-cell--3,
.app-skeleton-card-list .app-skeleton-cell--3 {
  width: 100%;
}

.app-skeleton-generic-table-row .app-skeleton-cell--4,
.app-skeleton-fields .app-skeleton-cell--4,
.app-skeleton-card-list .app-skeleton-cell--4 {
  width: 64%;
}

.app-skeleton-generic-table-row .app-skeleton-cell--5,
.app-skeleton-fields .app-skeleton-cell--5,
.app-skeleton-card-list .app-skeleton-cell--5 {
  width: 84%;
}

.app-skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.app-skeleton-stack--start {
  align-items: flex-start;
}

.app-skeleton-stack--end {
  align-items: flex-end;
}

.app-skeleton-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
}

.app-skeleton-image--sm {
  width: 40px;
  height: 40px;
  border-radius: 7px;
}

.app-skeleton-line--mono {
  height: 13px;
  border-radius: 6px;
}

.app-skeleton-line--text {
  height: 15px;
  border-radius: 7px;
}

.app-skeleton-line--muted,
.app-skeleton-line--tiny {
  height: 12px;
  border-radius: 6px;
}

.app-skeleton-line--tiny {
  width: 42px;
}

.app-skeleton-line--tag,
.app-skeleton-line--pill {
  height: 22px;
  width: 72px;
  border-radius: 6px;
}

.app-skeleton-line--pill {
  width: 58px;
  height: 19px;
}

.app-skeleton-line--price,
.app-skeleton-line--amount {
  width: 76px;
  height: 16px;
}

.app-skeleton-line--amount {
  justify-self: end;
}

.app-skeleton-line--stock {
  width: 34px;
  height: 15px;
  justify-self: end;
}

.app-skeleton-line--date {
  width: 96px;
  height: 14px;
}

.app-skeleton-line--time {
  width: 54px;
  height: 12px;
}

.app-skeleton-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-skeleton-action {
  width: 30px;
  height: 28px;
  border-radius: 7px;
}

.app-skeleton-action--primary {
  width: 34px;
}

.app-skeleton-expand {
  width: 18px;
  height: 18px;
  border-radius: 999px;
}

.app-skeleton-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app-skeleton-form-head {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 62px;
  margin-bottom: 2px;
  opacity: 0;
  animation: app-skeleton-enter 0.26s ease forwards;
}

.app-skeleton-field-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-height: 36px;
  opacity: 0;
  animation: app-skeleton-enter 0.26s ease forwards;
}

.app-skeleton-field-row--inline {
  grid-template-columns: 74px minmax(130px, 0.52fr);
}

.app-skeleton-field-row--textarea {
  align-items: flex-start;
}

.app-skeleton-field-label {
  width: 72px;
  height: 13px;
  justify-self: end;
}

.app-skeleton-field-control {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 34px;
  border: 1px solid #e5edf6;
  border-radius: 7px;
  padding: 8px 10px;
  background: #fff;
}

.app-skeleton-field-control--short {
  max-width: 280px;
}

.app-skeleton-field-control--textarea {
  min-height: 74px;
  align-items: flex-start;
  padding-top: 10px;
}

.app-skeleton-field-value {
  flex: 1;
  height: 13px;
}

.app-skeleton-field-icon {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.app-skeleton-field-addon {
  width: 24px;
  height: 18px;
  border-radius: 6px;
  flex: 0 0 auto;
}

.app-skeleton-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app-skeleton-card-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 14px;
  min-height: 72px;
  opacity: 0;
  animation: app-skeleton-enter 0.26s ease forwards;
}

.app-skeleton-card-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.app-skeleton-card-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-skeleton-finance-head {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 62px;
}

.app-skeleton-finance-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.9fr) minmax(0, 0.9fr);
  gap: 64px;
}

.app-skeleton-finance-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.app-skeleton-finance-card--wide {
  padding-right: 2px;
}

.app-skeleton-block {
  display: block;
  border-radius: 8px;
}

.app-skeleton-block--label {
  width: 74px;
  height: 17px;
}

.app-skeleton-block--button {
  width: 175px;
  height: 50px;
  border-radius: 7px;
}

.app-skeleton-block--sm {
  width: 126px;
  height: 24px;
}

.app-skeleton-block--title {
  width: 200px;
  height: 36px;
  margin-bottom: 4px;
}

.app-skeleton-block--line {
  width: 100%;
  height: 17px;
}

.app-skeleton-block--short {
  width: 74%;
  height: 17px;
}

.app-skeleton-delay-1::after {
  animation-delay: 0.04s;
}

.app-skeleton-delay-2::after {
  animation-delay: 0.1s;
}

.app-skeleton-delay-3::after {
  animation-delay: 0.16s;
}

.app-skeleton-delay-4::after {
  animation-delay: 0.22s;
}

.app-skeleton-delay-5::after {
  animation-delay: 0.28s;
}

.app-skeleton-delay-6::after {
  animation-delay: 0.34s;
}

@keyframes app-skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

@keyframes app-skeleton-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .app-skeleton-finance-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
