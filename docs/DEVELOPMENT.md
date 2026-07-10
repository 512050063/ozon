# 开发指南

> 基于 2026-06-18 实际项目代码规范提取

## 环境准备

### 必需

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | >= 18 | 运行时 |
| MySQL | >= 8.0 | 数据库 |
| npm / pnpm | 最新 | 包管理 |

### 可选

| 工具 | 用途 |
|------|------|
| Redis | 缓存（非必需） |
| Prisma VS Code 扩展 | 数据库可视化 |

## 启动步骤

```bash
# 1. 后端
cd backend
cp .env.example .env    # 填写 DATABASE_URL, JWT_SECRET 等
npm install
npx prisma migrate dev   # 首次：建表 + 种子数据
npm run dev              # → http://localhost:3000

# 2. 前端（新终端）
cd frontend
npm install
npm run dev              # → http://localhost:5173
```

## 前端开发规范

### Vue 组件风格

- **Composition API** + `<script setup lang="ts">`
- Props/Emits 使用 `defineProps<T>()` / `defineEmits<T>()` 宏
- 类型定义优先使用 `interface`，简单类型用 `type alias`

### Element Plus v-model 桥接模式

Element Plus 的 dialog/drawer 使用 `v-model` 控制显隐，从 props 传入时需桥接：

```typescript
// ✅ 正确：computed bridge
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// ❌ 错误：Vue 2 的 :visible 不生效
// <el-dialog :visible="visible" />
```

### API 调用层

所有 HTTP 请求统一走 `src/api/` 目录，每个业务模块一个文件：

```typescript
// src/api/ozonProductAPI.ts
import request from './request'

export function getProducts(storeId: string, params: ProductQuery) {
  return request.get(`/ozon/stores/${storeId}/local-products`, { params })
}
```

Axios 实例配置 (`request.ts`)：
- baseURL: `VITE_API_BASE_URL`
- timeout: **5 分钟**（大数据同步需要）
- 自动注入 `Authorization: Bearer <token>`
- 401 响应自动跳转登录页

### 状态管理

- 全局认证状态：`store/authStore.ts` (Pinia)
- 页面级数据：组件内 `ref/reactive`，不滥用全局 Store
- 选品临时数据：`store/selectionStore.ts`

## 后端开发规范

### 分层职责

```
Routes (路由)     → 参数校验、调用 Controller
→ Controller      → 解析请求、调用 Service、格式化响应
→ Service         → 核心业务逻辑、外部 API 调用、Prisma 操作
→ Utils           | Config → 纯函数工具、数据库/日志实例
```

### Prisma 使用规范

- 所有数据库操作在 Service 层完成，Controller 不直接操作 ORM
- 复杂查询使用 `Prisma.$queryRaw`，简单查询使用链式 API
- 字段更新优先使用 partial 对象解构避免遗漏

```typescript
// ✅ 推荐
await prisma.product.update({
  where: { id },
  data: { price: newPrice, stockFbo: newStock }
})

// 批量操作
await prisma.product.updateMany({ where: {...}, data: {...} })
```

### 认证中间件白名单

新增无需认证的路由时，修改 `app.ts` 中的中间件注册：

```typescript
// 当前白名单：
if (req.path.startsWith('/api/auth')) return next()
if (req.path === '/api/health') return next()
if (req.path === '/alibaba/auth/token' && req.method === 'GET') return next()
// ← 在此添加新的白名单路径
```

### 外部 API 调用

Ozon/1688 等外部 API 调用必须处理：
- **超时控制**: 使用 AbortController (推荐 15s)
- **重试机制**: 指数退避，最多 2~3 次
- **错误翻译**: Ozon 俄语错误码 → 中文提示

```typescript
async function fetchWithTimeout(url: string, options: Init, timeout = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
```

## 商品状态体系

Ozon 商品的 5 种显示状态和 7 个 Tab 过滤器是核心业务逻辑：

**显示状态** (getEffectiveStatus 唯一入口):
- `selling` — 在售 (VISIBLE + 有库存 + 无警告错误)
- `pending` — 准备出售 (有 warning 或无库存等)
- `error` — 不出售 (hasErrors 或 INVISIBLE)
- `archived` — 归档 (isArchived)
- `autoArchived` — 自动归档

**Tab 过滤器**:
- "待修改" Tab 不是状态，是 hasWarnings && !hasErrors 过滤器
- 前端必须基于 `getEffectiveStatus()` 判断显示状态

详见 [ARCHITECTURE.md](./ARCHITECTURE.md) 数据模型部分。

## 日志规范

后端 Winston 日志输出到 `backend/logs/`：

| 文件 | 内容 |
|------|------|
| combined.log | 所有级别日志 |
| error.log | error 及以上 |
| server.log | HTTP 请求日志 |

日志格式：`[时间戳] [级别] [模块] 消息`

前端调试使用 `console.debug()`，生产构建时会被 tree-shaking 移除。

## Git 提交规范

```
feat: 新功能
fix: Bug 修复
docs: 文档变更
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具变更
```

示例：
```
fix(product): 修复商品状态判断中 pending 与 moderating 混淆问题
feat(backend): 新增 Ozon Cookie 自动获取接口
```
