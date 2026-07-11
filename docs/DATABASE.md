# 数据库说明

> 基于 2026-07-11 `backend/prisma/schema.prisma` 和本地 MySQL 状态整理。

## 当前状态

- 数据库：MySQL
- ORM：Prisma 6.19
- Schema 文件：`backend/prisma/schema.prisma`
- 当前 Prisma model 数量：29
- 本地开发生成客户端：`cd backend && npx prisma generate`
- 新库开发迁移：`cd backend && npx prisma migrate dev`
- 已存在但缺少完整 migration baseline 的本地库，可用 `npx prisma db push` 对齐；涉及删表前必须先备份数据库。

## 核心数据域

| 数据域 | 主要模型 | 说明 |
|--------|----------|------|
| 账号权限 | `User`, `Role`, `UserLoginSession`, `WechatLoginSession` | 用户、角色权限、单点登录会话、微信扫码登录临时会话 |
| 店铺与 API | `OzonStore`, `ApiConfig`, `UserToken`, `OzonConfig` | Ozon 店铺、平台配置、1688 Token、偏好配置 |
| 商品与仓库 | `Product`, `WarehouseItem`, `OzonProductTemplate` | Ozon 商品同步、本地仓库映射、上架模板 |
| 类目属性 | `OzonCategory`, `OzonCategoryAttribute`, `OzonAttributeValue`, `OzonErrorCode` | Ozon 类目树、属性和值、错误码映射 |
| 货源与选品 | `ProductSelection`, `ProductSupply`, `SupplySource` | 选品收藏、上架商品、1688 货源 |
| 订单财务 | `OzonOrder`, `FinanceAccrual`, `SyncLog` | 订单、财务流水、同步日志 |
| 图片素材 | `Image`, `ImageReference` | 本地素材、头像和商品图片引用 |
| 客服推送 | `AutoReplyRule`, `OzonPushEvent` | 自动回复规则、Ozon 推送幂等记录 |
| 支付定价 | `PaymentRecord`, `PricingStrategy` | 会员支付记录、定价策略 |
| 翻译 | `TranslationCache`, `TranslationUsageMonthly` | 翻译缓存和月度用量 |

## 空表判断

空表不能直接等同于废弃表。当前已确认：

| 表 | 结论 | 原因 |
|----|------|------|
| `pricing_strategies` | 保留 | 定价策略功能仍在使用，空表只是当前没有策略数据 |
| `wechat_login_sessions` | 保留 | 微信扫码登录临时会话表，数据会过期清理 |
| `ozon_push_events` | 保留 | Ozon 推送接收、幂等和审计记录表，未收到推送时为空是正常状态 |

## 已移除的废弃表

以下表长期为空，并且运行时代码已经不再依赖，已从 Prisma schema、后端路由、前端 API、类型和注释脚本中移除：

| 表 | 原用途 | 替代/当前路径 |
|----|--------|---------------|
| `collection_items` | 旧采集库商品 | 1688 搜索与货源管理使用 `supply_sources` / `product_supplies` |
| `collection_item_images` | 旧采集库图片关联 | 图片统一走 `images` / `image_references` |
| `product_items` | 旧产品项 | 当前商品和仓库使用 `products` / `warehouse_items` / `product_supplies` |
| `product_item_images` | 旧产品项图片关联 | 图片统一走 `images` / `image_references` |
| `ozon_listings` | 旧 Ozon 上架记录 | 当前 Ozon 商品同步以 `products` + `warehouse_items` + `ozon_stores` 为主 |

对应迁移：

- `backend/prisma/migrations/20260710000100_drop_legacy_collection_product_items/migration.sql`
- `backend/prisma/migrations/20260711000100_drop_legacy_ozon_listings/migration.sql`

## 文档口径

- 当前结构以 `backend/prisma/schema.prisma` 和本文档为准。
- `docs/superpowers/` 下的 specs/plans 是历史方案记录，可能包含已移除表名，不作为当前数据库设计依据。
- `docs/technical/` 下部分文档来自项目早期设计，若与 Prisma schema 冲突，以 Prisma schema 为准。
