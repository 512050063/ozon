<template>
  <el-dialog :visible="visible" :title="null" :width="'460px'" @close="$emit('update:visible', false)">
    <template #header>
      <div class="flex items-center gap-3 text-left">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <el-icon class="text-blue-600">
            <Plus />
          </el-icon>
        </div>
        <div>
          <div class="text-base font-bold text-slate-900">
            添加价格策略
          </div>
          <div class="text-xs text-slate-500 mt-0.5">
            设置商品加价方式与策略说明</div>
        </div>
      </div>
    </template>
    <el-form :model="localForm" label-width="100px" class="pt-2">
      <el-form-item label="策略名称">
        <el-input v-model="localForm.name" placeholder="请输入策略名称" />
      </el-form-item>
      <el-form-item label="策略类型">
        <el-select v-model="localForm.type" placeholder="请选择类型" class="w-full">
          <el-option label="固定加价" value="fixed" />
          <el-option label="百分比加价" value="percentage" />
        </el-select>
      </el-form-item>
      <el-form-item label="加价数值">
        <div class="flex items-center gap-2">
          <el-input-number v-model="localForm.value" :min="0" />
          <span class="text-slate-500">{{ localForm.type === 'fixed' ? '₽' : '%' }}</span>
        </div>
      </el-form-item>
      <el-form-item label="策略描述">
        <el-input v-model="localForm.description" type="textarea" placeholder="请输入策略描述" />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue';

interface StrategyFormData {
  name: string;
  type: string;
  value: number;
  description: string;
}

interface Props {
  visible: boolean;
  formData: StrategyFormData;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  formData: () => ({
    name: '',
    type: 'fixed',
    value: 0,
    description: '',
  }),
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'update:formData': [value: StrategyFormData];
  save: [];
}>();

const createDefaultForm = (): StrategyFormData => ({
  name: '',
  type: 'fixed',
  value: 0,
  description: '',
});

const cloneForm = (value?: Partial<StrategyFormData>): StrategyFormData => ({
  ...createDefaultForm(),
  ...value,
});

const localForm = ref<StrategyFormData>(cloneForm(props.formData));

watch(
  () => props.formData,
  value => {
    localForm.value = cloneForm(value);
  },
  { deep: true }
);

watch(
  localForm,
  value => {
    emit('update:formData', cloneForm(value));
  },
  { deep: true }
);

const handleCancel = () => {
  emit('update:visible', false);
};

const handleSave = () => {
  emit('save');
};
</script>
