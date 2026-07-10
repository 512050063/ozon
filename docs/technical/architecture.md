---
name: ozon-crawler-architecture
description: Ozon跨境电商助手技术架构文档
---

# Ozon跨境电商助手 - 技术架构文档

---

## 📋 技术概述

### 项目名称
**Ozon跨境电商助手**

### 技术栈选择原则
- 学习曲线平缓，适合新手入门
- 生态成熟，有丰富的学习资源
- 社区活跃，遇到问题容易解决
- 性能满足需求，可扩展性好

---

## 🏗️ 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Client)                       │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐  │
│  │ 登录页    │  │ 首页统计  │  │ 选品分析  │  │ 仓库管理 │  │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ API配置   │  │ 1688货源  │  │ 一键上架  │              │
│  └───────────┘  └───────────┘  └───────────┘              │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS / RESTful API
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                       后端层 (Server)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Express.js Web Framework                 │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  认证中间件  │  错误处理  │  日志记录  │  CORS处理  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │用户模块  │ │API配置模块│ │选品模块  │ │仓库模块  │    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │  │
│  │翻译模块  │ │上架模块  │ │统计模块  │                │  │
│  └──────────┘ └──────────┘ └──────────┘                │  │
└────────────────────┬───────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ↓           ↓           ↓
┌──────────────┐ ┌───────┐ ┌─────────────┐
│   MongoDB    │ │ Redis │ │  外部API    │
│  (数据库)    │ │(缓存) │ │  (Ozon/1688)│
└──────────────┘ └───────┘ └─────────────┘
```

---

## 🛠️ 技术栈详解

### 前端技术栈

| 技术 | 版本 | 用途 | 学习难度 |
|-----|------|------|---------|
| **Vue** | 3.x | 用户界面框架 | ⭐⭐ |
| **TypeScript** | 5.x | 类型安全的JavaScript | ⭐⭐⭐ |
| **Vite** | 5.x | 构建工具，开发服务器 | ⭐ |
| **Tailwind CSS** | 3.x | 原子化CSS框架 | ⭐⭐ |
| **Vue Router** | 4.x | 前端路由 | ⭐⭐ |
| **ECharts** | 5.x | 数据可视化图表 | ⭐⭐ |
| **Axios** | 1.x | HTTP请求库 | ⭐⭐ |
| **Pinia** | 2.x | 状态管理 | ⭐⭐ |

#### 前端依赖安装
```bash
# 创建项目
npm create vite@latest ozon-crawler -- --template vue-ts

# 安装依赖
cd ozon-crawler
npm install
npm install tailwindcss postcss autoprefixer
npm install vue-router@4
npm install echarts
npm install axios
npm install pinia
npm install axios
npm install react-query
```

#### Tailwind CSS 配置
```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

### 后端技术栈

| 技术 | 版本 | 用途 | 学习难度 |
|-----|------|------|---------|
| **Node.js** | 20.x | JavaScript运行时 | ⭐⭐ |
| **Express.js** | 4.x | Web应用框架 | ⭐⭐ |
| **TypeScript** | 5.x | 类型安全的JavaScript | ⭐⭐⭐ |
| **Prisma** | 5.x | MySQL ORM | ⭐⭐ |
| **jsonwebtoken** | 9.x | JWT认证 | ⭐⭐ |
| **bcrypt** | 5.x | 密码加密 | ⭐⭐ |
| **express-validator** | 7.x | 请求验证 | ⭐⭐ |
| **winston** | 3.x | 日志记录 | ⭐⭐ |
| **cors** | 2.x | 跨域资源共享 | ⭐ |

#### 后端依赖安装
```bash
# 创建项目
mkdir ozon-crawler-api
cd ozon-crawler-api
npm init -y

# 安装依赖
npm install express mongoose jsonwebtoken bcrypt express-validator winston cors dotenv
npm install -D typescript @types/node @types/express @types/mongoose @types/cors ts-node-dev
```

---

### 数据库技术

#### MySQL (主数据库)
- **用途**：存储用户数据、商品信息、配置数据、日志
- **特点**：关系型数据库，结构严谨，查询功能强大
- **部署**：本地开发 → 腾讯云MySQL/阿里云RDS
- **设计原则**：
  - 规范化设计，减少数据冗余
  - 合理使用索引，提升查询性能
  - 事务处理关键操作

#### Redis (可选，缓存层)
- **用途**：缓存API响应、会话管理、限速限流
- **特点**：高性能内存数据库
- **使用场景**：
  - 缓存Ozon热门商品数据
  - 限制API调用频率
  - 存储临时会话信息

---

### 第三方API集成

#### 1. Ozon Seller API
- **文档地址**：https://docs.ozon.ru/global/en/
- **认证方式**：Client ID + API Key
- **主要接口**：
  - 商品搜索和分析
  - 商品上架和管理
  - 库存管理
  - 订单处理

#### 2. 1688开放平台API
- **文档地址**：https://open.1688.com/
- **认证方式**：App Key + App Secret
- **主要接口**：
  - 商品搜索
  - 商品详情获取
  - 供应商信息查询

#### 3. 翻译API（三选一）
- **百度翻译API**：推荐，免费额度多，中文优化好
- **腾讯翻译API**：稳定可靠
- **Google翻译API**：质量高但可能需要网络配置

---

## 📁 项目目录结构

### 前端目录结构
```
ozon-crawler/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/           # 静态资源
│   ├── components/       # 可复用组件
│   │   ├── common/       # 通用组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Table.tsx
│   │   │   └── Modal.tsx
│   │   ├── layout/       # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MainLayout.tsx
│   │   └── features/     # 功能组件
│   │       ├── ProductCard.tsx
│   │       ├── AnalyticsChart.tsx
│   │       └── ...
│   ├── hooks/            # 自定义Hook
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   └── useTranslation.ts
│   ├── pages/            # 页面组件
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ApiConfig.tsx
│   │   ├── ProductAnalysis.tsx
│   │   ├── Source1688.tsx
│   │   ├── Warehouse.tsx
│   │   └── Listing.tsx
│   ├── services/         # API调用服务
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
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### 后端目录结构
```
ozon-crawler-api/
├── src/
│   ├── config/           # 配置文件
│   │   ├── database.ts
│   │   ├── jwt.ts
│   │   └── ozon.ts
│   ├── controllers/      # 控制器
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── api-config.controller.ts
│   │   ├── product.controller.ts
│   │   ├── warehouse.controller.ts
│   │   ├── listing.controller.ts
│   │   └── translation.controller.ts
│   ├── middleware/       # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/           # 数据模型
│   │   ├── User.ts
│   │   ├── ApiConfig.ts
│   │   ├── Product.ts
│   │   ├── WarehouseItem.ts
│   │   └── Analytics.ts
│   ├── routes/           # 路由定义
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── api-config.routes.ts
│   │   ├── product.routes.ts
│   │   ├── warehouse.routes.ts
│   │   ├── listing.routes.ts
│   │   └── translation.routes.ts
│   ├── services/         # 业务逻辑
│   │   ├── ozon.service.ts
│   │   ├── 1688.service.ts
│   │   ├── translation.service.ts
│   │   └── analytics.service.ts
│   ├── utils/            # 工具函数
│   │   ├── logger.ts
│   │   ├── error.ts
│   │   └── response.ts
│   ├── validators/       # 验证器
│   │   ├── user.validator.ts
│   │   └── product.validator.ts
│   └── app.ts            # Express应用入口
├── tests/                # 测试文件
├── uploads/              # 上传文件目录
├── logs/                 # 日志目录
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎨 技术设计原则

### 前端设计原则

1. **组件化开发**
   - 每个功能拆分为独立组件
   - 组件保持单一职责
   - 复用公共组件

2. **状态管理**
   - 使用React Query管理服务器状态
   - 使用React Context管理全局状态
   - 本地状态使用useState/useReducer

3. **用户体验**
   - 加载状态提示
   - 错误处理和重试机制
   - 表单验证和实时反馈

### 后端设计原则

1. **RESTful API设计**
   - 资源导向的URL设计
   - 正确使用HTTP方法和状态码
   - 统一的响应格式

2. **分层架构**
   - Controller：处理请求和响应
   - Service：实现业务逻辑
   - Model：数据持久化

3. **错误处理**
   - 统一的错误处理中间件
   - 有意义的错误消息
   - 日志记录关键错误

4. **安全设计**
   - 密码bcrypt加密存储
   - JWT无状态认证
   - API调用频率限制
   - 输入验证和SQL注入防护

---

## 🚀 部署方案

### 开发环境
- 本地运行前后端
- MongoDB本地或Docker
- API密钥配置在.env文件

### 生产环境
- 前端：部署到Vercel或Netlify（免费且简单）
- 后端：部署到Railway或Heroku
- 数据库：MongoDB Atlas（免费512MB）

---

## 📊 性能优化考虑

### 前端优化
- 组件懒加载
- 图片压缩和懒加载
- 请求防抖和节流
- 合理使用缓存

### 后端优化
- 数据库索引优化
- API响应缓存（Redis）
- 异步处理耗时操作
- 请求限制和限流

---

## 🔧 开发工具

### 必备工具
- **VS Code**：代码编辑器
- **Git**：版本控制
- **Postman**：API测试
- **MongoDB Compass**：数据库可视化管理
- **Chrome DevTools**：前端调试

### 推荐VS Code插件
- ESLint - 代码检查
- Prettier - 代码格式化
- Auto Rename Tag - 自动重命名标签
- DotENV - .env文件高亮
- Tailwind CSS IntelliSense - Tailwind提示
