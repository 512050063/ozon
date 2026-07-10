<template>
  <div class="search-container">
    <el-input
      v-model="searchValue"
      :placeholder="placeholder"
      size="default"
      clearable
      @keyup.enter="handleSearch"
      class="input-search"
    />
    <el-button type="primary" size="default" class="btn-search" @click="handleSearch">
      <el-icon class="mr-1"><Search /></el-icon>搜索
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search } from '@element-plus/icons-vue';

interface Props {
  modelValue?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '搜索...',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'search', value: string): void;
}>();

const searchValue = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  searchValue.value = newVal;
});

const handleSearch = () => {
  emit('update:modelValue', searchValue.value);
  emit('search', searchValue.value);
};
</script>

