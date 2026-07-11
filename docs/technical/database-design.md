---
name: ozon-crawler-database-design
description: Ozon跨境电商助手数据库设计文档
---

# Ozon跨境电商助手 - 数据库设计

> 历史设计稿，仅供参考。当前项目使用 MySQL + Prisma，实际结构以 `backend/prisma/schema.prisma` 和 [../DATABASE.md](../DATABASE.md) 为准。

---

## 📋 设计概述

### 数据库选型
**MongoDB** - 文档数据库，适合电商场景的灵活数据结构

### 设计原则
1. 数据完整性和一致性
2. 查询性能优化
3. 可扩展性设计
4. 简单性和易用性

### 数据库架构
```
ozon_crawler_db/
├── users/                  # 用户集合
├── api_configs/            # API配置集合
├── products/               # 商品基础信息
├── warehouse_items/        # 本地仓库商品
├── analytics_data/         # 选品分析数据
├── translation_cache/      # 翻译缓存
└── system_logs/            # 系统日志
```

---

## 📊 集合设计

### 1. 用户集合 (users)

**用途**：存储系统用户信息，包括登录凭证和权限

```javascript
// users 集合示例文档
{
  _id: ObjectId("60d5ec4904a9a32f4472694d"),
  username: "ozon_seller123",
  email: "seller@example.com",
  password: "$2b$10$...", // bcrypt加密
  role: "seller", // admin, seller
  full_name: "张三",
  phone: "+8613800138000",
  store_name: "我的Ozon店铺",
  ozon_store_id: "123456",
  status: "active", // active, inactive, banned
  last_login: ISODate("2024-01-01T00:00:00Z"),
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-01T00:00:00Z"),
  preferences: {
    default_language: "zh-CN",
    timezone: "Asia/Shanghai",
    currency: "RUB"
  }
}
```

**索引建议**：
- `{ username: 1 }` - 唯一索引
- `{ email: 1 }` - 唯一索引
- `{ role: 1 }`
- `{ status: 1 }`

---

### 2. API配置集合 (api_configs)

**用途**：存储API凭证和配置信息，包括Ozon、1688、翻译API

```javascript
// api_configs 集合示例文档
{
  _id: ObjectId("60d5ec4904a9a32f4472694e"),
  user_id: ObjectId("60d5ec4904a9a32f4472694d"),
  platform: "ozon", // ozon, 1688, translation
  config: {
    client_id: "21345",
    api_key: "******************",
    api_version: "v3",
    last_used: ISODate("2024-01-01T00:00:00Z"),
    calls_today: 125,
    call_limit: 1000,
    status: "valid" // valid, invalid, expired
  },
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-01T00:00:00Z")
}
```

**索引建议**：
- `{ user_id: 1, platform: 1 }` - 复合唯一索引
- `{ platform: 1, status: 1 }`

---

### 3. 商品基础信息集合 (products)

**用途**：存储从Ozon和1688获取的原始商品数据

```javascript
// products 集合示例文档
{
  _id: ObjectId("60d5ec4904a9a32f4472694f"),
  user_id: ObjectId("60d5ec4904a9a32f4472694d"),
  source: "ozon", // ozon, 1688
  external_id: "12345678", // 外部平台ID
  title: {
    original: "Оригинальный товар",
    translated: "原装商品"
  },
  description: {
    original: "Описание на русском",
    translated: "中文描述"
  },
  price: {
    source_price: 999,
    source_currency: "RUB",
    converted_price: 99,
    converted_currency: "CNY",
    exchange_rate: 0.10,
    profit_margin: 0.3
  },
  images: [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  categories: [
    { id: "123", name: "Электроника", translated: "电子产品" }
  ],
  specifications: [
    { name: "品牌", value: "Samsung", translated: "三星" },
    { name: "型号", value: "Galaxy S20", translated: "Galaxy S20" }
  ],
  source_info: {
    ozon: {
      url: "https://www.ozon.ru/product/123",
      seller_id: "4567",
      seller_name: "Официальный магазин",
      rating: 4.8,
      reviews_count: 1200,
      sales_count: 5000,
      stock: 45,
      last_updated: ISODate("2024-01-01T00:00:00Z")
    },
    1688: {
      url: "https://1688.com/product/12345",
      supplier_id: "7890",
      supplier_name: "深圳市XX电子",
      min_order: 10,
      moq_price: 50,
      shipping_time: "2-5天",
      rating: 4.6,
      transaction_count: 1234,
      last_updated: ISODate("2024-01-01T00:00:00Z")
    }
  },
  status: "analyzed", // analyzing, analyzed, discarded
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-01T00:00:00Z")
}
```

**索引建议**：
- `{ user_id: 1, source: 1 }`
- `{ user_id: 1, status: 1 }`
- `{ external_id: 1, source: 1 }`
- `{ "categories.id": 1 }`

---

### 4. 本地仓库商品集合 (warehouse_items)

**用途**：存储已添加到本地仓库的商品，等待上架到Ozon

```javascript
// warehouse_items 集合示例文档
{
  _id: ObjectId("60d5ec4904a9a32f44726950"),
  user_id: ObjectId("60d5ec4904a9a32f4472694d"),
  product_id: ObjectId("60d5ec4904a9a32f4472694f"),
  ozon_product_id: "prod_12345",
  title: {
    original: "Оригинальный товар",
    translated: "原装商品",
    listing_title: "中文转俄语优化标题"
  },
  price: {
    source_price: 99,
    source_currency: "CNY",
    listing_price: 1499,
    listing_currency: "RUB",
    margin: 0.3,
    shipping_cost: 250
  },
  stock: {
    local: 50,
    ozon: 45,
    1688: 1000,
    last_checked: ISODate("2024-01-01T00:00:00Z")
  },
  images: [
    "https://cdn.example.com/image1.jpg",
    "https://cdn.example.com/image2.jpg"
  ],
  specifications: [
    { name: "品牌", value: "Samsung", translated: "三星" }
  ],
  listing_data: {
    category_id: "123456",
    attributes: [
      { id: "789", value: "黑色" },
      { id: "456", value: "100g" }
    ],
    description: "优化后的商品描述",
    package_info: {
      weight: 0.5,
      dimensions: { w: 10, h: 20, d: 5 }
    }
  },
  status: "pending", // pending, listing, listed, failed, unlisted
  listing_info: {
    last_attempt: ISODate("2024-01-01T00:00:00Z"),
    attempts: 3,
    error_message: "Category not available",
    listed_at: ISODate("2024-01-01T00:00:00Z")
  },
  tags: ["热门", "新品", "电子产品"],
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-01T00:00:00Z")
}
```

**索引建议**：
- `{ user_id: 1, status: 1 }` - 快速查询待上架商品
- `{ user_id: 1, tags: 1 }` - 标签搜索
- `{ product_id: 1 }` - 关联商品查询

---

### 5. 选品分析数据集合 (analytics_data)

**用途**：存储选品分析的结果和数据

```javascript
// analytics_data 集合示例文档
{
  _id: ObjectId("60d5ec4904a9a32f44726952"),
  user_id: ObjectId("60d5ec4904a9a32f4472694d"),
  report_type: "ozon_top_products",
  parameters: {
    category_id: "123",
    time_range: "30d",
    price_min: 0,
    price_max: 5000,
    min_rating: 4.0,
    min_sales: 100
  },
  results: [
    {
      product_id: ObjectId("60d5ec4904a9a32f4472694f"),
      score: 0.85,
      ranking: 1,
      metrics: {
        sales_growth: 0.35,
        price_trend: -0.05,
        rating: 4.8,
        reviews_count: 1200
      }
    }
  ],
  created_at: ISODate("2024-01-01T00:00:00Z"),
  expires_at: ISODate("2024-01-08T00:00:00Z")
}
```

**索引建议**：
- `{ user_id: 1, report_type: 1 }`
- `{ user_id: 1, expires_at: 1 }` - 过期数据清理

---

### 7. 翻译缓存集合 (translation_cache)

**用途**：缓存翻译结果，减少API调用次数

```javascript
// translation_cache 集合示例文档
{
  _id: ObjectId("60d5ec4904a9a32f44726953"),
  user_id: ObjectId("60d5ec4904a9a32f4472694d"),
  original_text: "Оригинальный текст",
  source_lang: "ru",
  target_lang: "zh-CN",
  translated_text: "原文",
  translation_service: "baidu",
  confidence: 0.95,
  usage_count: 12,
  expires_at: ISODate("2024-02-01T00:00:00Z"),
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-01T00:00:00Z")
}
```

**索引建议**：
- `{ user_id: 1, original_text: 1, source_lang: 1, target_lang: 1 }` - 复合索引
- `{ expires_at: 1 }` - 过期数据清理

---

### 8. 系统日志集合 (system_logs)

**用途**：存储系统操作日志，用于审计和调试

```javascript
// system_logs 集合示例文档
{
  _id: ObjectId("60d5ec4904a9a32f44726954"),
  user_id: ObjectId("60d5ec4904a9a32f4472694d"),
  level: "info", // error, warn, info, debug
  message: "商品123上架成功",
  details: {
    product_id: "123",
    status: "success",
    duration: 5.2
  },
  ip_address: "192.168.1.100",
  user_agent: "Mozilla/5.0...",
  created_at: ISODate("2024-01-01T00:00:00Z")
}
```

**索引建议**：
- `{ user_id: 1, level: 1 }` - 查询用户的错误/警告日志
- `{ created_at: -1 }` - 按时间排序查询
- `{ "details.product_id": 1 }` - 按商品查询日志

---

## 🔄 数据关联关系

### 用户与API配置
```
User 1 ←→ N ApiConfig
```
- 每个用户可以有多个API配置（Ozon、1688、翻译API）
- 查询时使用 `user_id` 字段关联

### 用户与商品
```
User 1 ←→ N Product
```
- 每个用户的商品数据独立存储
- 查询时使用 `user_id` 字段关联

### 商品与本地仓库
```
Product 1 ←→ 1 WarehouseItem
```
- 每个商品在仓库中最多有一个条目
- 通过 `product_id` 字段关联

## 📈 查询优化建议

### 高频查询场景

1. **用户登录查询**
   ```javascript
   db.users.findOne({ username: "testuser" })
   // 已建立索引 { username: 1 }
   ```

2. **待上架商品查询**
   ```javascript
   db.warehouse_items.find({
     user_id: user_id,
     status: "pending"
   }).sort({ created_at: -1 })
   // 已建立索引 { user_id: 1, status: 1 }
   ```

3. **商品搜索查询**
   ```javascript
   db.products.find({
     user_id: user_id,
     title_translated: { $regex: "搜索词" }
   })
   // 建议添加文本索引
   ```

### 建议的文本索引
```javascript
// 为商品标题创建文本索引
db.products.createIndex({ "title.translated": "text" })

// 查询时使用
db.products.find({ $text: { $search: "电子产品" } })
```

---

## 🛡️ 数据安全和备份

### 数据加密
- 密码使用bcrypt加密存储
- API密钥和敏感信息使用字段级别加密
- 传输加密使用HTTPS

### 备份策略
- 每日自动备份
- 关键操作（用户创建、API配置更新）实时备份
- 备份保留期限：30天

### 恢复策略
- 定期测试恢复流程
- 支持按时间点恢复
- 异地备份存储

---

## 📊 容量规划

### 初始容量预估（100用户）
- 每日数据增长：约100MB
- 第一年总存储：约35GB
- 主要增长来源：商品图片、分析报告、系统日志

### 扩展策略
- MongoDB分片集群
- 数据压缩
- 冷热数据分离
- 定期数据清理
