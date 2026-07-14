# 系统架构

> 基于 2026-07-14 实际代码结构提取

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    浏览器 (Browser)                    │
│                                                       │
│  ┌─────────── Vue 3 SPA ──────────────────────────┐  │
│  │  Element Plus UI │ Pinia 状态 │ Vue Router      │  │
│  │  ECharts 图表   │ Axios HTTP │ Tailwind CSS    │  │
│  └──────────────────┬──────────────────────────────┘  │
│                     │ REST API (JSON)                  │
└─────────────────────┼─────────────────────────────────┘
                      │
              ┌───────▼────────┐
              │   Express      │  :3000
              │   中间件链:     │
              │  CORS → Logger │
              │  → JSON → Auth │
              │  → Routes      │
              └───┬──────┬─────┘
                  │      │
        ┌──────────▼┐  ┌▼──────────────┐
        │  MySQL    │  │  Redis / 外部服务 │
        │  (Prisma) │  │  Ozon API       │
        │           │  │  1688 API       │
        │  34 models│  │  微信 API       │
        └───────────┘  └────────────────┘
```

## 前端架构

### 目录职责

```
frontend/src/
├── views/                  # 页面视图（按业务模块组织）
│   ├── dashboard/          # 仪表盘
│   ├── product-analysis/   # 选品分析 - Ozon优选
│   ├── price-management/   # 选品分析 - 竞价监控
│   ├── source-collection/  # 货源采集 (1688)
│   ├── warehouse/          # 本地仓库
│   │   ├── product-library/    # 商品库
│   │   └── material-library/   # 素材库(图片)
│   ├── ozon/               # Ozon 模块
│   │   ├── store-management/   # 店铺管理
│   │   ├── product-management/ # 商品管理
│   │   ├── order-management/   # 订单管理
│   │   └── pricing-strategy/   # 定价策略
│   ├── customer-service/   # 智能客服
│   │   ├── auto-reply/        # 自动回复
│   │   └── message-center/     # 消息中心，店铺级 Ozon 会话/通知缓存
│   ├── settings/           # 系统设置
│   └── pages/              # 通用页面 (Login, VIP, NotFound)
├── components/ui/         # 通用 UI 组件库 (20 个)
├── api/                   # API 请求层 (27 个模块，Axios 封装)
├── store/                 # Pinia Store (authStore)
├── router/index.ts        # 路由 + 守卫 (认证 + 角色权限)
├── types/                 # 全局 TypeScript 类型定义
└── styles/                # 样式 (Tailwind + Element Plus 覆盖 + 动画)
```

### 路由与权限体系

路由守卫三级检查：
1. **requiresAuth** — 未登录跳转 `/auth`
2. **guestOnly** — 已登录访问登录页则跳转 `/dashboard`
3. **menuKey** — 基于用户角色 `permissions` 字段，无权限重定向 `/dashboard`

菜单权限 Key 采用点分层级：`ozon/product-management`、`settings/account-info` 等。

### 组件设计模式

- **UI 组件库** (`components/ui/`)：20 个通用业务组件，统一 `App-` 前缀命名
- **对话框/抽屉**：Element Plus v-model bridge 模式（computed getter/setter）
- **表格组件**：`AppTable` + `AppPagination` + `AppSearchTabs` 组合
- **状态管理**：`authStore` 管理认证，页面内数据用 `ref/reactive` 本地状态

## 后端架构

### 分层架构

```
请求 → Middleware (Auth/RBAC) → Router → Controller → Service → Prisma/外部API
```

| 层级 | 职责 | 文件数 |
|------|------|--------|
| Routes | 路由定义、参数校验 | 28 |
| Controllers | 请求处理、响应格式化 | 26 |
| Services | 业务逻辑、外部API调用 | 33 |
| Utils | JWT/Bcrypt/AES 工具函数 | 3 |
| Config | 数据库客户端、日志配置 | 2 |

### 认证与权限 (RBAC)

```
authenticateToken (全局中间件, 排除 /api/auth, /api/health, /alibaba/auth/token)
  └─ requireRole(['admin', 'seller'])  // 角色白名单
  └─ requireAdmin                     // 仅 super_admin
  └─ requireSeller                    // admin 或 seller
```

- JWT 有效期 24 小时
- 密码 Bcrypt 哈希 (10 轮盐)
- API 密钥 AES-256-CBC 加密存储
- 微信扫码登录 (公众号场景值)

### 数据模型

核心实体关系：

```
User (用户)
├── Role (角色) — permissions JSON 字段
├── UserLoginSession / WechatLoginSession (登录会话)
├── OzonStore (店铺) — AES 加密 apiKey
│   ├── Product (商品) — Ozon 同步数据
│   ├── WarehouseItem (仓库商品)
│   ├── OzonOrder (订单)
│   ├── FinanceAccrual (财务流水)
│   └── SyncLog (同步日志)
├── ProductSelection (选品收藏)
├── ProductSupply (供应商品)
│   └── SupplySource (1688 货源)
├── AutoReplyRule (自动回复规则)
├── OzonPushEvent (Ozon 推送幂等记录)
├── OzonMessageConversation / OzonMessageItem / OzonMessageSyncState (消息中心缓存)
├── PricingStrategy (定价策略)
├── Image (图片)
│   └── ImageReference (图片使用关系)
├── PaymentRecord (支付记录)
├── ApiConfig (API 配置)
├── UserToken (平台 Token)
├── OzonCategory (类目) — 自关联树结构
├── OzonCategoryAttribute / OzonAttributeValue (类目属性和值)
├── OzonErrorCode (错误码映射)
├── OzonProductTemplate (上架模板)
├── OzonConfig (Ozon 偏好配置)
└── TranslationCache (翻译缓存)
```

废弃空表 `collection_items`、`collection_item_images`、`product_items`、`product_item_images`、`ozon_listings` 已从 schema 和运行时代码移除；数据库清理依据见 [DATABASE.md](./DATABASE.md)。

### 定时任务

| 任务 | 实现 | 说明 |
|------|------|------|
| 类目同步 | `categorySyncScheduler.ts` + node-cron | 定时拉取 Ozon 类目变更 |
| 会话清理 | entry.ts + setInterval | 每 30 分钟清理过期微信登录会话 |
| 优雅关闭 | process SIGTERM/SIGINT | 停止定时任务 → 断开数据库 |

### 关键服务调用链

**商品同步**: Controller → ozonProductService (Ozon Seller API V2) → Prisma upsert → 前端轮询

**1688 货源搜索**: Controller → alibabaService (1688 API OAuth) → 解析返回 → 入库 supply_sources/product_supplies

**消息中心**: Controller → ozonMessageService → MySQL 缓存优先 → 必要时 Ozon Chat API v1；`TYPE_NEW_MESSAGE` 推送会把会话标记为 stale，下次读取刷新

**消息回复**: Controller → ozonMessageService (Ozon Chat API v1) → fetchWithTimeout + retry → 标记会话 stale

**类型提取**: Controller → ozonTypeService (AI/规则) → 批量异步处理
