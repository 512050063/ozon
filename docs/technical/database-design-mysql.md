---
name: ozon-crawler-database-mysql
description: Ozon跨境电商助手MySQL数据库设计文档
---

# Ozon跨境电商助手 - MySQL数据库设计

> 历史设计稿，仅供参考。当前实际结构以 `backend/prisma/schema.prisma` 和 [../DATABASE.md](../DATABASE.md) 为准。

---

## 📋 设计概述

### 数据库选型
**MySQL** - 关系型数据库，适合结构化数据存储

### 设计原则
1. **规范化设计**：遵循第三范式，减少数据冗余
2. **完整性约束**：使用外键约束，确保数据一致性
3. **性能优化**：合理使用索引，提升查询性能
4. **事务支持**：关键操作使用事务处理
5. **可扩展性**：考虑未来数据增长

---

## 📊 表结构设计

### 1. 用户表 (users)

**用途**：存储系统用户信息

```sql
CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
  `email` VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
  `role` ENUM('admin', 'seller') DEFAULT 'seller' COMMENT '角色',
  `full_name` VARCHAR(100) NOT NULL COMMENT '真实姓名',
  `phone` VARCHAR(20) COMMENT '电话',
  `store_name` VARCHAR(100) COMMENT '店铺名称',
  `ozon_store_id` VARCHAR(50) COMMENT 'Ozon店铺ID',
  `status` ENUM('active', 'inactive', 'banned') DEFAULT 'active' COMMENT '账号状态',
  `last_login` DATETIME COMMENT '最后登录时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

---

### 2. API配置表 (api_configs)

**用途**：存储API配置信息

```sql
CREATE TABLE `api_configs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `platform` ENUM('ozon', '1688', 'translation') NOT NULL COMMENT '平台类型',
  `config` JSON NOT NULL COMMENT 'API配置（JSON格式）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API配置表';

-- 索引
CREATE UNIQUE INDEX idx_api_configs_user_platform ON api_configs(user_id, platform);
CREATE INDEX idx_api_configs_platform ON api_configs(platform);
```

---

### 3. 商品表 (products)

**用途**：存储商品基础信息

```sql
CREATE TABLE `products` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `source` ENUM('ozon', '1688') NOT NULL COMMENT '数据源',
  `external_id` VARCHAR(50) NOT NULL COMMENT '外部平台ID',
  `title_original` VARCHAR(255) NOT NULL COMMENT '原始标题',
  `title_translated` VARCHAR(255) COMMENT '翻译后标题',
  `description_original` TEXT COMMENT '原始描述',
  `description_translated` TEXT COMMENT '翻译后描述',
  `price_source` DECIMAL(10,2) NOT NULL COMMENT '源价格',
  `price_converted` DECIMAL(10,2) NOT NULL COMMENT '转换后价格',
  `currency_source` VARCHAR(3) NOT NULL COMMENT '源货币',
  `currency_converted` VARCHAR(3) NOT NULL COMMENT '转换后货币',
  `exchange_rate` DECIMAL(10,4) NOT NULL COMMENT '汇率',
  `profit_margin` DECIMAL(5,4) COMMENT '利润率',
  `images` JSON COMMENT '图片链接（JSON数组）',
  `categories` JSON COMMENT '类目信息（JSON数组）',
  `specifications` JSON COMMENT '规格参数（JSON数组）',
  `source_info` JSON NOT NULL COMMENT '源平台信息（JSON）',
  `status` ENUM('analyzing', 'analyzed', 'discarded') DEFAULT 'analyzing' COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 索引
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_source ON products(source);
CREATE INDEX idx_products_external_id ON products(external_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_title ON products(title_translated);
```

---

### 4. 本地仓库表 (warehouse_items)

**用途**：存储本地仓库商品

```sql
CREATE TABLE `warehouse_items` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `product_id` INT NOT NULL COMMENT '商品ID',
  `ozon_product_id` VARCHAR(50) COMMENT 'Ozon商品ID',
  `title_listing` VARCHAR(255) COMMENT '上架标题',
  `stock_local` INT DEFAULT 0 COMMENT '本地库存',
  `stock_ozon` INT DEFAULT 0 COMMENT 'Ozon库存',
  `stock_1688` INT DEFAULT 0 COMMENT '1688库存',
  `price_source` DECIMAL(10,2) NOT NULL COMMENT '源价格',
  `price_listing` DECIMAL(10,2) NOT NULL COMMENT '上架价格',
  `shipping_cost` DECIMAL(10,2) DEFAULT 0 COMMENT '运费',
  `listing_data` JSON COMMENT '上架数据（JSON）',
  `status` ENUM('pending', 'listing', 'listed', 'failed', 'unlisted') DEFAULT 'pending' COMMENT '状态',
  `listing_info` JSON COMMENT '上架信息（JSON）',
  `tags` JSON COMMENT '标签（JSON数组）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='本地仓库表';

-- 索引
CREATE INDEX idx_warehouse_items_user_id ON warehouse_items(user_id);
CREATE INDEX idx_warehouse_items_product_id ON warehouse_items(product_id);
CREATE INDEX idx_warehouse_items_status ON warehouse_items(status);
```

---

### 5. 选品分析数据表 (analytics_data)

**用途**：存储选品分析数据

```sql
CREATE TABLE `analytics_data` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `report_type` VARCHAR(50) NOT NULL COMMENT '报告类型',
  `parameters` JSON NOT NULL COMMENT '查询参数（JSON）',
  `results` JSON NOT NULL COMMENT '分析结果（JSON）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL COMMENT '过期时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='选品分析数据表';

-- 索引
CREATE INDEX idx_analytics_data_user_id ON analytics_data(user_id);
CREATE INDEX idx_analytics_data_report_type ON analytics_data(report_type);
CREATE INDEX idx_analytics_data_expires_at ON analytics_data(expires_at);
```

---

### 7. 翻译缓存表 (translation_cache)

**用途**：存储翻译结果缓存

```sql
CREATE TABLE `translation_cache` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `original_text` TEXT NOT NULL COMMENT '原文',
  `translated_text` TEXT NOT NULL COMMENT '译文',
  `source_lang` VARCHAR(10) NOT NULL COMMENT '源语言',
  `target_lang` VARCHAR(10) NOT NULL COMMENT '目标语言',
  `translation_service` VARCHAR(20) DEFAULT 'baidu' COMMENT '翻译服务',
  `confidence` DECIMAL(3,2) DEFAULT 0.9 COMMENT '置信度',
  `usage_count` INT DEFAULT 1 COMMENT '使用次数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL COMMENT '过期时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='翻译缓存表';

-- 索引
CREATE INDEX idx_translation_cache_user_id ON translation_cache(user_id);
CREATE INDEX idx_translation_cache_expires_at ON translation_cache(expires_at);
```

---

### 8. 系统日志表 (system_logs)

**用途**：存储系统操作日志

```sql
CREATE TABLE `system_logs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT COMMENT '用户ID',
  `level` ENUM('error', 'warn', 'info', 'debug') DEFAULT 'info' COMMENT '日志级别',
  `message` VARCHAR(255) NOT NULL COMMENT '日志消息',
  `details` JSON COMMENT '详细信息（JSON）',
  `ip_address` VARCHAR(45) COMMENT 'IP地址',
  `user_agent` VARCHAR(255) COMMENT '用户代理',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统日志表';

-- 索引
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
```

---

## 🔄 数据关联关系

### 用户与API配置
```
users (1) ←→ api_configs (N)
```
- 每个用户可以有多个API配置（Ozon、1688、翻译API）

### 用户与商品
```
users (1) ←→ products (N)
```
- 每个用户的商品数据独立存储

### 商品与本地仓库
```
products (1) ←→ warehouse_items (1)
```
- 每个商品在仓库中最多有一个条目

## 📈 查询优化建议

### 高频查询场景

1. **用户登录查询**
   ```sql
   SELECT * FROM users WHERE username = 'testuser'
   -- 已建立索引 idx_users_username
   ```

2. **待上架商品查询**
   ```sql
   SELECT * FROM warehouse_items 
   WHERE user_id = ? AND status = 'pending'
   ORDER BY created_at DESC
   -- 已建立索引 idx_warehouse_items_user_id
   ```

3. **商品搜索查询**
   ```sql
   SELECT * FROM products 
   WHERE user_id = ? 
     AND (title_original LIKE '%搜索词%' OR title_translated LIKE '%搜索词%')
   -- 建议添加全文索引
   ```

### 全文索引建议
```sql
-- 为商品标题创建全文索引
ALTER TABLE products ADD FULLTEXT idx_products_title(title_original, title_translated);

-- 查询时使用
SELECT * FROM products 
WHERE MATCH(title_original, title_translated) AGAINST('搜索词' IN BOOLEAN MODE);
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
- 每日数据增长：约50MB
- 第一年总存储：约18GB
- 主要增长来源：商品图片、分析报告、系统日志

### 扩展策略
- 分库分表（数据量增大时）
- 数据压缩
- 冷热数据分离
- 定期数据清理

---

## 🔧 Prisma ORM配置

### Prisma Schema示例
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id          Int          @id @default(autoincrement())
  username    String       @unique
  email       String       @unique
  password    String
  role        String       @default("seller")
  fullName    String
  phone       String?
  storeName   String?
  ozonStoreId String?
  status      String       @default("active")
  lastLogin   DateTime?
  apiConfigs  ApiConfig[]
  products    Product[]
  warehouseItems WarehouseItem[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model ApiConfig {
  id         Int     @id @default(autoincrement())
  userId     Int
  platform   String
  config     Json
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  @@unique([userId, platform])
}

// 其他模型...
```

### Prisma配置文件
```bash
# .env
DATABASE_URL="mysql://username:password@localhost:3306/ozon_crawler_db"

# package.json scripts
"scripts": {
  "db:init": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:reset": "prisma migrate reset",
  "db:studio": "prisma studio"
}
```
