<template>
  <el-dialog :visible="visible" :title="null" :width="'460px'" @close="$emit('update:visible', false)">
    <template #header>
      <div class="flex items-center gap-3 text-left">
        <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <el-icon class="text-red-600">
            <Warning />
          </el-icon>
        </div>
        <div>
          <div class="text-base font-bold text-slate-900">添加预警规则</div>
          <div class="text-xs text-slate-500 mt-0.5">配置价格、成本或利润率提示</div>
        </div>
      </div>
    </template>
    <el-form :model="localForm" label-width="100px" class="pt-2">
      <el-form-item label="规则名称">
        <el-input v-model="localForm.name" placeholder="请输入规则名称" />
      </el-form-item>
      <el-form-item label="预警条件">
        <el-select v-model="localForm.condition" placeholder="请选择条件" class="w-full">
          <el-option label="成本价高于售价" value="cost_high" />
          <el-option label="售价低于" value="price_low" />
          <el-option label="利润率低于阈值" value="margin_low" />
        </el-select>
      </el-form-item>
      <el-form-item label="阈值">
        <div class="flex items-center gap-2">
          <el-input-number v-model="localForm.threshold" :min="0" />
          <span class="text-slate-500">₽</span>
        </div>
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
import { Warning } from '@element-plus/icons-vue';

interface AlertRuleFormData {
  name: string;
  condition: string;
  threshold: number;
}

interface Props {
  visible: boolean;
  formData: AlertRuleFormData;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  formData: () => ({
    name: '',
    condition: '',
    threshold: 0,
  }),
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'update:formData': [value: AlertRuleFormData];
  save: [];
}>();

const createDefaultForm = (): AlertRuleFormData => ({
  name: '',
  condition: '',
  threshold: 0,
});

const cloneForm = (value?: Partial<AlertRuleFormData>): AlertRuleFormData => ({
  ...createDefaultForm(),
  ...value,
});

const localForm = ref<AlertRuleFormData>(cloneForm(props.formData));

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
