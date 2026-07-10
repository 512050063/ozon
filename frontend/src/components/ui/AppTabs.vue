<template>
  <div class="app-tabs-wrapper bg-white rounded-xl border border-slate-200 px-5 mb-4 overflow-hidden h-[100px] flex items-center shadow-sm">
    <div class="flex items-center gap-6 overflow-x-auto h-full pl-4">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="handleTabChange(tab.value)"
        :class="[
          'px-4 h-full cursor-pointer text-sm transition-all duration-200 relative flex items-center border-b-2 border-transparent whitespace-nowrap',
          modelValue === tab.value ? 'text-blue-600 font-semibold' : 'text-slate-500 font-medium hover:text-slate-900'
        ]"
      >
        <span
          v-if="modelValue === tab.value"
          class="absolute bottom-0 left-0 right-0 h-1 rounded-t-full bg-blue-600"
        >
        </span>
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.count !== undefined"
          :class="[
            'ml-2 text-xs px-1.5 py-0.5 rounded min-w-[20px] text-center font-medium',
            tab.color
              ? ''
              : modelValue === tab.value ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
          ]"
          :style="tab.color ? { backgroundColor: tab.color + '30', color: tab.color } : {}"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  label: string;
  value: string;
  count?: number;
  color?: string;
}

interface Props {
  modelValue: string;
  tabs: Tab[];
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

const handleTabChange = (value: string) => {
  emit('update:modelValue', value);
  emit('change', value);
};
</script>
