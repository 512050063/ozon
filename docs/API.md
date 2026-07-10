# API 接口参考

> 基于 2026-06-18 实际路由定义提取，共 21 个路由模块

## 认证模块 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /register | 用户注册 | 否 |
| POST | /login | 密码登录 | 否 |
| POST | /forgot-password | 忘记密码 | 否 |
| GET | /me | 当前用户信息 | 是 |
| PUT | /profile | 修改资料 | 是 |
| POST | /avatar | 上传头像 | 是 |
| GET | /wechat/qrcode | 微信登录二维码 | 否 |
| GET | /wechat/status | 轮询扫码状态 | 否 |
| POST | /wechat/callback | 微信回调 | 否 |
| POST | /wechat/unbind | 解绑微信 | 是 |
| POST | /send-verification-code | 发送验证码 | 是 |
| POST | /verify-code | 验证手机号 | 是 |
| PUT | /change-password | 修改密码 | 是 |

---

## Ozon 店铺管理 `/api/ozon/stores`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 店铺列表 |
| GET | /:id | 店铺详情 |
| POST | / | 添加店铺 |
| PUT | /:id | 更新店铺 |
| DELETE | /:id | 删除店铺 |
| POST | /test-connection | 测试连接 |
| GET | /error-codes | 错误码列表 |
| POST | /translate-error | 翻译错误信息 |
| GET | /:storeId/product-ids | 商品 ID 列表 |
| POST | /:storeId/product-details | 批量商品详情 |
| POST | /:storeId/sync-products | 同步商品 |
| GET | /:storeId/local-products | 本地商品 |
| DELETE | /:storeId/local-products/:productId | 删除本地商品 |
| POST | /:storeId/list-product | 上架商品 |
| PUT | /:storeId/products/:productId/price | 更新价格 |
| PUT | /:storeId/products/:productId/stock | 更新库存 |
| POST | /:storeId/sync-stock | 同步库存 |
| GET | /:storeId/products/:productId/detail | 商品详情(实时) |
| GET | /:storeId/sync-logs | 同步日志 |

## Ozon 类目 `/api/ozon/categories`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /sync | 同步类目 |
| POST | /sync/incremental | 增量同步 |
| POST | /sync/all | 全量同步 |
| GET | /tree | 类目树 |
| GET | /list | 类目列表 |
| GET | /stats | 统计信息 |
| GET | /:id | 类目详情 |
| GET | /:id/attributes | 类目属性 |
| GET | /attributes/:id/values | 属性值列表 |
| GET | /created-time | 创建时间 |
| GET | /sync-logs | 同步日志 |

## Ozon 订单 `/api/ozon/orders`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /:storeId/sync | 同步订单 |
| GET | /:storeId | 订单列表 |
| GET | /:storeId/:postingNumber | 订单详情 |
| GET | /:storeId/sync-logs | 同步日志 |

## Ozon 消息 `/api/ozon/messages`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /:storeId/conversations | 会话列表 |
| GET | /:storeId/conversations/:conversationId | 消息历史 |
| POST | /:storeId/conversations/:conversationId/reply | 回复消息 |

## Ozon 爬虫 `/api/ozon/crawler`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /search?keyword= | Playwright 搜索 |
| GET | /hot | 热销商品 |

## Ozon 搜索 `/api/ozon/search`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /search?q= | 关键词搜索 |

## Ozon 类型提取 `/api/ozon/type`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /extract-type | 单个类型提取 |
| POST | /batch-extract | 批量提取 |
| GET | /batch-status | 批量进度 |

## Ozon Cookie `/api/ozon/cookie`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /fetch | 自动获取 Cookie (Playwright) |
| POST | /import | 手动导入 Cookie |
| GET | / | 查看 Cookie 状态 |

---

## 1688 货源 `/api/alibaba`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /auth/token | 获取 Token |
| GET | /auth/page | 授权页面 |
| GET | /auth/status | 授权状态 |
| GET | /auth/authorize | 执行授权 |
| GET | /search?keyword= | 商品搜索 |
| GET | /products/:productId | 商品详情 |
| GET | /suppliers/:supplierId | 供应商信息 |
| POST | /batch | 批量操作 |
| POST | /search/image | 以图搜款 |
| GET | /search/similar | 搜同款 |
| POST | /config | 配置管理 |

---

## 采集库 `/api/collection`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 采集列表 |
| GET | /:id | 采集详情 |
| POST | / | 新增采集 |
| PUT | /:id | 更新采集 |
| DELETE | /:id | 删除采集 |
| POST | /:id/move | 移入商品库 |

## 选品管理 `/api/product-selection`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /products/selection | 添加选品 |
| GET | /products/selection | 选品列表 |
| GET | /products/selection/:id | 选品详情 |
| PUT | /products/selection/:id | 更新选品 |
| DELETE | /products/selection/:id | 删除选品 |

## 商品供应(上架) `/api/product-supply`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 供应列表 |
| GET | /:id | 详情 |
| POST | / | 新增 |
| POST | /:id/list-to-ozon | 上架到 Ozon |
| GET | /:id/listing-status | 上架状态 |
| PUT | /:id | 更新 |
| DELETE | /:id | 删除 |

## 定价策略 `/api/pricing`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 策略列表 |
| GET | /:id | 策略详情 |
| POST | / | 创建策略 |
| PUT | /:id | 更新策略 |
| DELETE | /:id | 删除策略 |

## 自动回复 `/api/auto-reply`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 规则列表 |
| GET | /:id | 规则详情 |
| POST | / | 创建规则 |
| PUT | /:id | 更新规则 |
| DELETE | /:id | 删除规则 |

## 图片管理 `/api/images`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 图片列表 |
| GET | /stats | 图片统计 |
| POST /upload | 上传图片 |
| DELETE | /:id | 删除图片 |
| DELETE /batch | 批量删除 |
| GET | /:id/usage | 使用检查 |
| POST | /batch/usage | 批量使用检查 |

---

## 系统管理

### 用户管理 `/api/users` (admin)

CRUD: GET /, GET /:id, POST /, PUT /:id, DELETE /:id

### 角色管理 `/api/roles` (admin)

CRUD: GET /, GET /:id, POST /, PUT /:id, DELETE /:id

### API 配置 `/api/api-configs` (admin)

GET /, GET /:platform, PUT /:platform, DELETE /:platform, POST /:platform/test

### 支付记录 `/api/payment-records` (admin)

GET /all, GET /my, GET /:id, POST /, PUT /:id, DELETE /:id

### 会员管理 `/api/membership`

GET /, POST /trial, POST /upgrade

### 健康检查

GET /api/health — 无需认证

---

## 通用响应格式

```json
// 成功
{ "code": 0, "data": {...}, "message": "ok" }

// 分页
{ "code": 0, "data": { "items": [...], "total": 100, "page": 1, "pageSize": 20 } }

// 错误
{ "code": 401, "message": "未授权" }
```

**注意**: 所有 `/api/*` 路由（除 auth、health、alibaba/auth/token 外）均需要 JWT Bearer Token。
