# Ozon Seller 运营管理系统

全栈电商运营工具，服务于 Ozon 俄罗斯电商平台卖家，涵盖选品分析、1688 货源、商品与促销管理、订单与财务同步、定价策略、智能客服、账号权限等完整运营链路。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3.4 + Element Plus 2.13 + Tailwind CSS 3.4 + Vite 5 + TypeScript 5.3 |
| 状态管理 | Pinia 2.1 |
| 路由 | Vue Router 4.2 (History 模式) |
| 图表 | ECharts 5.4 |
| 后端 | Express 4.18 + TypeScript 5.3 |
| 数据库 | MySQL (Prisma 6.19 ORM) |
| 认证 | JWT (jsonwebtoken) + 微信扫码登录 |
| 爬虫 | Playwright 1.60 (Ozon 搜索) + Cheerio (HTML 解析) |
| 日志 | Winston 3.11 |
| 缓存/任务 | Redis (ioredis 5.3) / node-cron 4.2 |

## 项目结构

```
ozon/
├── frontend/                    # Vue 3 前端
│   ├── src/
│   │   ├── views/               # 页面视图 (按业务模块组织)
│   │   ├── components/ui/       # 通用 UI 组件库 (20 个)
│   │   ├── api/                 # API 请求层 (27 个模块)
│   │   ├── store/               # Pinia 状态管理
│   │   ├── router/              # 路由配置 + 守卫
│   │   ├── types/               # TypeScript 类型定义
│   │   └── styles/              # 样式文件
│   └── package.json
├── backend/                     # Express + Prisma 后端
│   ├── prisma/schema.prisma     # 数据模型 (29 个 Prisma model)
│   ├── src/
│   │   ├── controllers/         # 控制器层 (26 个)
│   │   ├── services/            # 服务层 (33 个)
│   │   ├── routes/              # 路由层 (28 个)
│   │   ├── middleware/           # 认证中间件 (RBAC)
│   │   ├── utils/               # JWT / 密码 / AES 加密
│   │   └── config/              # 数据库 / 日志配置
│   └── package.json
├── docs/                        # 项目文档
└── README.md                    # 本文件
```

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL >= 8.0
- Redis (可选，用于缓存)

### 1. 配置环境变量

```bash
# backend/.env
DATABASE_URL="mysql://user:password@localhost:3306/ozon_db"
JWT_SECRET="your-jwt-secret"
PORT=3000

# frontend/.env.local
VITE_API_BASE_URL=http://localhost:3000/api
```

### 2. 启动后端

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev   # 新库开发环境
npm run dev    # 监听 :3000
```

如果本地数据库已经存在但没有完整 Prisma migration baseline，可先使用 `npx prisma db push` 对齐 schema；涉及删表的操作先备份数据库。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev    # 监听 :5173
```

## 业务模块

| 模块 | 说明 |
|------|------|
| 选品分析 (Ozon优选) | Ozon 商品搜索、热销分析、批量类型提取 |
| 竞价监控 | 定价策略管理、竞价预警规则 |
| 货源采集 | 1688 商品搜索、图搜同款、货源管理、绑定上架商品 |
| 本地仓库 | 商品库管理、素材库(图片)、一键上架 Ozon |
| 店铺管理 | 多店铺 CRUD、连接测试、商品同步 |
| 商品管理 | 商品列表/详情、状态体系(5态7Tab)、价格库存行内编辑、促销活动商品管理 |
| 订单与财务 | 订单同步、订单详情、财务流水、同步日志 |
| 定价策略 | 基础价/运费/税率/利润率/平台费率配置 |
| 智能客服 | 自动回复规则(关键词匹配)、消息中心(买家会话) |
| 系统设置 | 账号信息、角色权限(RBAC)、用户管理、API 配置 |
| 会员系统 | 试用 / 免费 / 标准版 / 专业版 |

## 数据库说明

当前主库是 MySQL + Prisma。近期已清理确认废弃的空表和旧代码链路：

- 已移除：`collection_items`、`collection_item_images`、`product_items`、`product_item_images`、`ozon_listings`
- 保留：`pricing_strategies`、`wechat_login_sessions`、`ozon_push_events`，这些表是有效业务表或运行期临时表，空表不代表废弃
- 详情见 [docs/DATABASE.md](./docs/DATABASE.md)

详细文档见 [docs/](./docs/) 目录。
