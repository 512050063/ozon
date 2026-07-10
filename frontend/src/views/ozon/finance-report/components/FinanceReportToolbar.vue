<template>
  <div class="report-toolbar app-page-table-toolbar">
    <div class="toolbar-content">
      <div class="toolbar-main">
        <div ref="periodPickerRef" class="ozon-period-picker">
          <button
            type="button"
            :class="['ozon-period-trigger', { 'is-open': periodPickerOpen }]"
            aria-haspopup="dialog"
            :aria-expanded="periodPickerOpen"
            @click.stop="$emit('toggle-period-picker')"
          >
            <el-icon class="ozon-period-icon"><Calendar /></el-icon>
            <span class="ozon-period-label">{{ periodLabel }}</span>
            <el-icon class="ozon-period-chevron"><ArrowDown /></el-icon>
          </button>

          <transition name="period-popover">
            <div v-if="periodPickerOpen" class="ozon-period-popover" @click.stop>
              <div class="ozon-period-calendars">
                <section
                  v-for="(month, monthIndex) in visibleCalendarMonths"
                  :key="month.key"
                  class="ozon-calendar-month"
                >
                  <div class="ozon-calendar-header">
                    <button
                      v-if="monthIndex === 0"
                      type="button"
                      class="ozon-calendar-nav"
                      aria-label="上个月"
                      @click="$emit('navigate-month', -1)"
                    >
                      ‹
                    </button>
                    <span v-else class="ozon-calendar-nav-placeholder" />
                    <div class="ozon-calendar-title">{{ month.title }}</div>
                    <button
                      v-if="monthIndex === 1"
                      type="button"
                      class="ozon-calendar-nav"
                      aria-label="下个月"
                      @click="$emit('navigate-month', 1)"
                    >
                      ›
                    </button>
                    <span v-else class="ozon-calendar-nav-placeholder" />
                  </div>

                  <div class="ozon-weekdays">
                    <span v-for="dayName in weekDayLabels" :key="dayName">{{ dayName }}</span>
                  </div>

                  <div class="ozon-calendar-grid">
                    <template v-for="day in month.days" :key="day.key">
                      <span v-if="!day.date" class="ozon-calendar-day is-blank" />
                      <button
                        v-else
                        type="button"
                        :class="getCalendarDayClass(day)"
                        :disabled="day.disabled"
                        :title="day.disabledReason"
                        @click="$emit('select-day', day)"
                      >
                        <span>{{ day.day }}</span>
                      </button>
                    </template>
                  </div>
                </section>
              </div>

              <div class="ozon-quick-months">
                <button
                  v-for="month in quickMonthRanges"
                  :key="month.key"
                  type="button"
                  :class="['ozon-quick-month', { 'is-active': isQuickMonthActive(month) }]"
                  @click="$emit('apply-quick-month', month)"
                >
                  {{ month.label }}
                </button>
              </div>
            </div>
          </transition>
        </div>

        <el-select
          :model-value="postingType"
          placeholder="全部类型"
          clearable
          class="select-base finance-select type-select"
          popper-class="select-base-popper"
          @update:model-value="$emit('update:postingType', String($event ?? ''))"
          @change="$emit('search')"
        >
          <template #prefix>
            <el-icon class="finance-select-icon"><Histogram /></el-icon>
          </template>
          <el-option label="全部" value="" />
          <el-option label="订单" value="orders" />
          <el-option label="退货和取消" value="returns" />
          <el-option label="服务费" value="services" />
          <el-option label="补贴" value="compensation" />
          <el-option label="快递费用" value="transferDelivery" />
          <el-option label="其他" value="other" />
        </el-select>
      </div>

      <div class="toolbar-meta">
        <AppUpdateButton
          text="财报同步"
          :loading="isSyncUpdating"
          :loading-text="syncProgress"
          :disabled="!selectedStoreId"
          :last-update-time="lastUpdateTime"
          :update-status="syncVisualStatus"
          :module="module"
          @click="$emit('sync')"
          @detail="$emit('open-sync-log')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ArrowDown, Calendar, Histogram } from '@element-plus/icons-vue';
import { AppUpdateButton } from '@/components/ui';

type CalendarDay = {
  key: string;
  date: Date | null;
  day: number;
  value: string | null;
  disabled: boolean;
  disabledReason: string;
  isWeekend: boolean;
};

type CalendarMonth = {
  key: string;
  title: string;
  days: CalendarDay[];
};

type QuickMonthRange = {
  key: string;
  label: string;
  from: string;
  to: string;
};

type SyncVisualStatus = 'success' | 'error' | 'idle';

const props = defineProps<{
  periodPickerOpen: boolean;
  periodLabel: string;
  visibleCalendarMonths: CalendarMonth[];
  weekDayLabels: string[];
  quickMonthRanges: QuickMonthRange[];
  postingType: string;
  isSyncUpdating: boolean;
  syncProgress: string;
  selectedStoreId: number | null;
  lastUpdateTime: string | null;
  syncVisualStatus: SyncVisualStatus;
  module: string;
  getCalendarDayClass: (day: CalendarDay) => unknown;
  isQuickMonthActive: (month: QuickMonthRange) => boolean;
}>();

const emit = defineEmits<{
  (event: 'toggle-period-picker'): void;
  (event: 'close-period-picker'): void;
  (event: 'navigate-month', direction: number): void;
  (event: 'select-day', day: CalendarDay): void;
  (event: 'apply-quick-month', month: QuickMonthRange): void;
  (event: 'update:postingType', value: string): void;
  (event: 'search'): void;
  (event: 'sync'): void;
  (event: 'open-sync-log'): void;
}>();

const periodPickerRef = ref<HTMLElement | null>(null);

function handleOutsideClick(event: MouseEvent) {
  if (!props.periodPickerOpen) return;
  const target = event.target as Node | null;
  if (target && periodPickerRef.value?.contains(target)) return;
  emit('close-period-picker');
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<style scoped>
.report-toolbar {
  min-height: var(--app-search-toolbar-height, 100px);
  padding: 0 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.58);
  background: #ffffff !important;
  background-image: none !important;
  box-shadow: none !important;
  display: flex;
  align-items: center;
}

.report-toolbar::before,
.report-toolbar::after {
  display: none !important;
}

.toolbar-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1 1 auto;
}

.toolbar-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-left: auto;
}

.ozon-period-picker {
  position: relative;
  flex: 0 0 auto;
}

.ozon-period-trigger {
  width: 280px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid #dbe3ef;
  border-radius: 7px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  outline: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 1px 2px rgba(15, 23, 42, 0.04);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;
}

.ozon-period-trigger:hover,
.ozon-period-trigger.is-open,
.ozon-period-trigger:focus-visible {
  border-color: #409eff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 1px 2px rgba(15, 23, 42, 0.04);
}

.ozon-period-icon {
  color: #94a3b8;
  font-size: 15px;
  flex-shrink: 0;
}

.ozon-period-label {
  min-width: 0;
  flex: 1;
  text-align: left;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ozon-period-chevron {
  color: #94a3b8;
  font-size: 13px;
  flex-shrink: 0;
  transition: transform 0.16s ease;
}

.ozon-period-trigger.is-open .ozon-period-chevron {
  transform: rotate(180deg);
}

.ozon-period-popover {
  position: absolute;
  z-index: 30;
  top: calc(100% + 8px);
  left: 0;
  width: min(660px, calc(100vw - 56px));
  display: grid;
  grid-template-columns: minmax(0, 1fr) 78px;
  gap: 12px;
  padding: 16px 14px 14px;
  border: 1px solid rgba(203, 213, 225, 0.95);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
}

.ozon-period-calendars {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

.ozon-calendar-month {
  min-width: 0;
}

.ozon-calendar-header {
  height: 30px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 30px;
  align-items: center;
  margin-bottom: 10px;
}

.ozon-calendar-title {
  text-align: center;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.ozon-calendar-nav,
.ozon-calendar-nav-placeholder {
  width: 30px;
  height: 30px;
}

.ozon-calendar-nav {
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #475569;
  font-size: 25px;
  line-height: 26px;
  cursor: pointer;
  outline: none;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}

.ozon-calendar-nav:hover,
.ozon-calendar-nav:focus-visible {
  background: #eef4ff;
  color: #005bff;
}

.ozon-weekdays,
.ozon-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.ozon-weekdays {
  margin-bottom: 6px;
}

.ozon-weekdays span {
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8b96a8;
  font-size: 11px;
  font-weight: 600;
}

.ozon-calendar-grid {
  gap: 2px 0;
}

.ozon-calendar-day {
  position: relative;
  height: 34px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  outline: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.ozon-calendar-day span {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.ozon-calendar-day:hover:not(.is-disabled):not(.is-selected-start):not(.is-selected-end) span,
.ozon-calendar-day:focus-visible:not(.is-disabled):not(.is-selected-start):not(.is-selected-end) span {
  background: #eef4ff;
  color: #005bff;
}

.ozon-calendar-day.is-weekend:not(.is-disabled):not(.is-selected-start):not(.is-selected-end) {
  color: #ef6477;
}

.ozon-calendar-day.is-in-range {
  background: #eaf2ff;
  color: #334155;
}

.ozon-calendar-day.is-selected-start,
.ozon-calendar-day.is-selected-end {
  background: #eaf2ff;
  color: #ffffff;
}

.ozon-calendar-day.is-range-row-start {
  border-radius: 8px 0 0 8px;
}

.ozon-calendar-day.is-range-row-end {
  border-radius: 0 8px 8px 0;
}

.ozon-calendar-day.is-single-selected {
  background: transparent;
  border-radius: 0;
}

.ozon-calendar-day.is-selected-start span,
.ozon-calendar-day.is-selected-end span {
  background: #005bff;
  border-radius: 8px;
  box-shadow: 0 6px 12px rgba(0, 91, 255, 0.25);
}

.ozon-calendar-day.is-disabled {
  color: #c8d0dc;
  cursor: not-allowed;
}

.ozon-calendar-day.is-blank {
  pointer-events: none;
}

.ozon-quick-months {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 238px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-left: 12px;
  border-left: 1px solid #eef2f7;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
}

.ozon-quick-months::-webkit-scrollbar {
  width: 5px;
}

.ozon-quick-months::-webkit-scrollbar-track {
  background: transparent;
}

.ozon-quick-months::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.48);
}

.ozon-quick-month {
  height: 32px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  padding: 0 10px;
  cursor: pointer;
  outline: none;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}

.ozon-quick-month:hover,
.ozon-quick-month:focus-visible,
.ozon-quick-month.is-active {
  background: #eef4ff;
  color: #1d4ed8;
}

.period-popover-enter-active,
.period-popover-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.period-popover-enter-from,
.period-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.type-select { width: 150px; }

.finance-select {
  --el-select-height: 36px !important;
  min-width: 0;
}

.finance-select :deep(.el-select__wrapper) {
  padding-left: 12px !important;
}

.finance-select :deep(.el-select__selected-item),
.finance-select :deep(.el-select__selected-item span),
.finance-select :deep(.el-select__placeholder) {
  color: #475569;
  font-weight: 700;
}

.finance-select-icon {
  color: #94a3b8;
  font-size: 14px;
}

@media (max-width: 960px) {
  .report-toolbar {
    min-height: auto;
    padding: 18px 20px;
  }

  .toolbar-content {
    align-items: stretch;
  }

  .toolbar-meta {
    width: 100%;
    justify-content: flex-end;
    margin-left: 0;
  }
}

@media (max-width: 640px) {
  .ozon-period-picker,
  .ozon-period-trigger,
  .type-select {
    width: 100%;
  }

  .ozon-period-popover {
    width: calc(100vw - 40px);
    grid-template-columns: minmax(0, 1fr);
  }

  .ozon-period-calendars {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .ozon-quick-months {
    flex-direction: row;
    flex-wrap: wrap;
    border-left: 0;
    border-top: 1px solid #eef2f7;
    padding: 10px 0 0;
  }

  .ozon-quick-month {
    flex: 1 1 72px;
    text-align: center;
  }
}
</style>
