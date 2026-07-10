---
name: ozon-crawler-frontend-vue
description: Ozon跨境电商助手Vue前端架构设计文档
---

# Ozon跨境电商助手 - Vue前端架构设计

---

## 📋 设计原则

### 前端设计原则
1. **组件化**：合理拆分组件，单一职责
2. **响应式**：适配不同屏幕尺寸
3. **可用性**：操作流程简单直观
4. **视觉美观**：专业的UI设计风格
5. **性能优化**：加载速度和运行流畅
6. **可维护性**：代码结构清晰，易于修改

### 新手友好设计
1. **清晰的导航**：引导用户找到需要的功能
2. **操作提示**：关键操作有提示信息
3. **进度反馈**：耗时操作有进度显示
4. **错误提示**：友好的错误提示和解决建议
5. **帮助文档**：内置使用说明和FAQ

---

## 🎨 UI设计风格

### 设计风格
- **简洁现代**：简洁的界面设计
- **专业商务**：符合跨境电商的专业性
- **易于使用**：直观的操作流程
- **信息清晰**：数据展示清晰易读

### 颜色方案
```css
/* 主色调 */
--primary-color: #3b82f6; /* 蓝色 - 表示主要操作 */
--primary-hover: #2563eb;

/* 辅助色 */
--secondary-color: #64748b; /* 灰色 - 表示次要信息 */
--success-color: #22c55e; /* 绿色 - 表示成功 */
--warning-color: #f59e0b; /* 黄色 - 表示警告 */
--error-color: #ef4444; /* 红色 - 表示错误 */

/* 中性色 */
--bg-color: #f8fafc;
--card-bg: #ffffff;
--text-primary: #1e293b;
--text-secondary: #64748b;
--border-color: #e2e8f0;
```

---

## 📱 页面结构

### 页面路由规划
```
/                    - 登录页
/dashboard           - 首页/控制台
/api-config          - API配置页
/product-analysis    - 选品分析页
/source-1688         - 1688货源页
/warehouse           - 本地仓库页
/listing             - 一键上架页
/settings            - 个人设置页
```

### 主布局结构
```
┌─────────────────────────────────────────────────────────┐
│  Header (顶部导航)                                         │
│  [Logo] [标题] [用户信息] [登出]                          │
├─────────────────────────────────────────────────────────┤
│                                 │                         │
│  Sidebar                        │  Main Content           │
│  (侧边栏导航)                    │  (主内容区)              │
│                                 │                         │
│  - 首页                        │                         │
│  - API配置                    │                         │
│  - 选品分析                    │                         │
│  - 1688货源                   │                         │
│  - 本地仓库                    │                         │
│  - 一键上架                    │                         │
│                                 │                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📄 页面详细设计

### 1. 登录页 (/login)

**页面功能**：
- 用户名/密码登录
- 记住登录状态
- 忘记密码（待实现）
- 新用户注册（待实现）

**组件结构**：
```
LoginPage/
├── LoginForm (登录表单)
│   ├── UsernameInput
│   ├── PasswordInput
│   ├── RememberMe
│   └── LoginButton
└── PageHeader
```

---

### 2. 首页/控制台 (/dashboard)

**页面功能**：
- 关键指标展示
- 趋势图表
- 快捷操作入口
- 最近活动

**组件结构**：
```
DashboardPage/
├── DashboardStats (统计卡片)
│   ├── StatCard (单个统计卡片)
│   └── QuickActions (快捷操作)
├── ProductTrendChart (商品趋势图表)
└── RecentActivity (最近活动列表)
```

---

### 3. API配置页 (/api-config)

**页面功能**：
- Ozon API配置
- 1688 API配置
- 翻译API配置
- 连接测试
- 状态展示

**组件结构**：
```
ApiConfigPage/
├── ApiConfigCard (API配置卡片)
│   ├── ApiConfigForm (配置表单)
│   ├── TestButton (测试按钮)
│   └── StatusIndicator (状态指示器)
└── ApiUsageInfo (使用信息)
```

---

### 4. 选品分析页 (/product-analysis)

**页面功能**：
- Ozon选品分析
- 商品搜索和筛选
- 商品详情查看
- 添加到候选列表

**组件结构**：
```
ProductAnalysisPage/
├── SearchBar (搜索栏)
├── FilterBar (筛选栏)
│   ├── CategoryFilter
│   ├── PriceRangeFilter
│   └── SalesFilter
├── ProductList (商品列表)
│   └── ProductCard (商品卡片)
└── Pagination (分页)
```

---

### 5. 1688货源页 (/source-1688)

**页面功能**：
- 1688货源查找
- 供应商对比
- 添加到本地仓库
- 候选商品管理

**组件结构**：
```
Source1688Page/
├── SearchModeSelector (搜索方式选择)
├── SearchBar (搜索栏)
├── SourceList (货源列表)
│   └── SourceCard (货源卡片)
└── ImportFromCandidateModal (从候选导入弹窗)
```

---

### 6. 本地仓库页 (/warehouse)

**页面功能**：
- 商品列表管理
- 编辑商品信息
- 商品状态管理
- 批量操作

**组件结构**：
```
WarehousePage/
├── FilterBar (筛选栏)
├── WarehouseTable (仓库表格)
│   ├── WarehouseRow (表格行)
│   └── ActionButtons (操作按钮)
├── EditProductModal (编辑商品弹窗)
└── BatchOperations (批量操作菜单)
```

---

### 7. 一键上架页 (/listing)

**页面功能**：
- 选择待上架商品
- 设置上架策略
- 执行上架操作
- 查看上架结果

**组件结构**：
```
ListingPage/
├── ProductSelector (商品选择器)
├── StrategySettings (策略设置)
│   ├── PriceStrategySelector
│   ├── StockStrategySelector
│   └── CategorySelector
├── StartListingButton (开始上架按钮)
├── ListingProgress (上架进度)
└── ResultsModal (结果弹窗)
```

---

## 🧩 可复用组件

### 基础组件

#### Button 按钮组件
**用途**：各种操作按钮
**变体**：
- Primary (主要操作)
- Secondary (次要操作)
- Success (成功确认)
- Warning (警告操作)
- Danger (危险操作)

```vue
<template>
  <button 
    :class="buttonClasses" 
    :disabled="disabled || isLoading"
    @click="$emit('click', $event)"
  >
    <span v-if="isLoading" class="loading-spinner"></span>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  isLoading: false
})

const buttonClasses = computed(() => [
  'px-4 py-2 rounded font-medium transition-colors',
  {
    'bg-blue-500 hover:bg-blue-600 text-white': props.variant === 'primary',
    'bg-gray-500 hover:bg-gray-600 text-white': props.variant === 'secondary',
    'bg-green-500 hover:bg-green-600 text-white': props.variant === 'success',
    'bg-yellow-500 hover:bg-yellow-600 text-white': props.variant === 'warning',
    'bg-red-500 hover:bg-red-600 text-white': props.variant === 'danger',
  },
  {
    'opacity-50 cursor-not-allowed': props.disabled || props.isLoading
  }
])
</script>
```

#### Input 输入框组件
**用途**：文本输入、密码输入

```vue
<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-sm font-medium text-gray-700">
      {{ label }}
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="input-classes"
      @input="handleInput"
    />
    <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: string
  type?: 'text' | 'password' | 'email'
  label?: string
  placeholder?: string
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const handleInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>
```

#### Card 卡片组件
**用途**：容器组件，包装内容

```vue
<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <div v-if="title || $slots.header" class="px-6 py-4 border-b border-gray-200">
      <slot name="header">
        <h3 v-if="title" class="text-lg font-semibold text-gray-900">{{ title }}</h3>
      </slot>
    </div>
    <div class="p-6">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>
```

#### Modal 弹窗组件
**用途**：显示表单、确认对话框等

```vue
<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black bg-opacity-50" @click="$emit('close')"></div>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md relative">
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 v-if="title" class="text-lg font-semibold text-gray-900">{{ title }}</h3>
            <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6">
            <slot></slot>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: ''
})

defineEmits<{
  close: []
}>()
</script>
```

#### Table 表格组件
**用途**：显示列表数据

```vue
<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th v-for="column in columns" :key="column.key" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody v-if="loading" class="bg-white divide-y divide-gray-200">
        <tr>
          <td :colspan="columns.length" class="px-6 py-4 text-center text-gray-500">
            加载中...
          </td>
        </tr>
      </tbody>
      <tbody v-else-if="data.length === 0" class="bg-white divide-y divide-gray-200">
        <tr>
          <td :colspan="columns.length" class="px-6 py-4 text-center text-gray-500">
            暂无数据
          </td>
        </tr>
      </tbody>
      <tbody v-else class="bg-white divide-y divide-gray-200">
        <tr v-for="(row, rowIndex) in data" :key="rowIndex" class="hover:bg-gray-50">
          <td v-for="column in columns" :key="column.key" class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            <template v-if="$slots[`cell-${column.key}`]">
              <slot :name="`cell-${column.key}`" :row="row" :index="rowIndex"></slot>
            </template>
            <template v-else>
              {{ row[column.key] }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'

interface Column {
  key: string
  label: string
}

interface Props {
  columns: Column[]
  data: any[]
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false
})
</script>
```

#### Badge 徽章组件
**用途**：显示状态、标签

```vue
<template>
  <span :class="badgeClasses" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
    <slot></slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'success' | 'warning' | 'danger' | 'info'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info'
})

const badgeClasses = computed(() => ({
  'bg-green-100 text-green-800': props.variant === 'success',
  'bg-yellow-100 text-yellow-800': props.variant === 'warning',
  'bg-red-100 text-red-800': props.variant === 'danger',
  'bg-blue-100 text-blue-800': props.variant === 'info',
}))
</script>
```

---

## 🔄 状态管理

### Pinia Store 设计

#### Auth Store
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)
  
  const isAuthenticated = computed(() => !!token.value)

  async function login(username: string, password: string) {
    // 调用登录API
    // 保存token和user
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout
  }
})
```

#### App Store
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return {
    sidebarCollapsed,
    toggleSidebar
  }
})
```

---

## 📝 表单验证

### 使用 VeeValidate

```typescript
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// 登录表单验证
const loginSchema = yup.object({
  username: yup.string().required('请输入用户名').min(3, '用户名至少3个字符'),
  password: yup.string().required('请输入密码').min(6, '密码至少6个字符')
})

const { handleSubmit } = useForm({
  validationSchema: loginSchema
})

const { value: username, errorMessage: usernameError } = useField('username')
const { value: password, errorMessage: passwordError } = useField('password')
```

---

## 🚀 性能优化

### 前端优化策略
1. **代码分割**：按路由懒加载组件
2. **图片优化**：使用CDN、懒加载、适当尺寸
3. **数据缓存**：使用Pinia + LocalStorage
4. **防抖节流**：搜索等操作防抖处理
5. **虚拟列表**：长列表使用虚拟滚动

---

## 📁 前端项目结构

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/           # 静态资源
│   ├── components/       # 可复用组件
│   │   ├── common/       # 通用组件
│   │   │   ├── Button.vue
│   │   │   ├── Input.vue
│   │   │   ├── Card.vue
│   │   │   ├── Modal.vue
│   │   │   └── Table.vue
│   │   ├── layout/       # 布局组件
│   │   │   ├── Header.vue
│   │   │   ├── Sidebar.vue
│   │   │   └── MainLayout.vue
│   │   └── features/     # 功能组件
│   │       ├── ProductCard.vue
│   │       └── AnalyticsChart.vue
│   ├── composables/      # 可复用逻辑
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   └── useTranslation.ts
│   ├── stores/           # Pinia stores
│   │   ├── auth.ts
│   │   ├── app.ts
│   │   └── products.ts
│   ├── views/            # 页面组件
│   │   ├── LoginView.vue
│   │   ├── DashboardView.vue
│   │   ├── ApiConfigView.vue
│   │   ├── ProductAnalysisView.vue
│   │   ├── Source1688View.vue
│   │   ├── WarehouseView.vue
│   │   └── ListingView.vue
│   ├── services/         # API服务
│   │   ├── api.ts
│   │   ├── ozon.ts
│   │   └── 1688.ts
│   ├── types/            # TypeScript类型定义
│   │   ├── product.ts
│   │   ├── user.ts
│   │   └── api.ts
│   ├── utils/            # 工具函数
│   │   ├── format.ts
│   │   ├── validate.ts
│   │   └── constants.ts
│   ├── router/           # 路由配置
│   │   └── index.ts
│   ├── App.vue
│   └── main.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🔧 路由配置示例

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue')
      },
      {
        path: 'api-config',
        name: 'api-config',
        component: () => import('@/views/ApiConfigView.vue')
      },
      // 其他路由...
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: '/login' }
  }
  
  if (to.path === '/login' && authStore.isAuthenticated) {
    return { path: '/dashboard' }
  }
})

export default router
```
