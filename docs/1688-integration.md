# 1688 集成技术文档

> 项目：Ozon卖家工具 | 最后更新：2026-06-03

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (Vue3)                         │
│  SourceCollectionView.vue  /  SettingsView.vue           │
│         │                          │                     │
│    搜同类/搜同款              授权配置/触发授权            │
│         │                          │                     │
│         ▼                          ▼                     │
│  alibabaAPI.ts ────────► 后端 Express (localhost:3000)   │
│                              │                           │
│                              ▼                           │
│                     alibabaController.ts                 │
│                              │                           │
│                              ▼                           │
│                     alibabaService.ts                    │
│                        │       │                         │
│              ┌─────────┘       └──────────┐              │
│              ▼                            ▼              │
│         SQLite 数据库              1688 开放平台 API      │
│   ┌──────────────────┐        ┌──────────────────┐       │
│   │ api_configs 表    │        │ gw.open.1688.com │       │
│   │ (静态配置)        │        │ auth.1688.com    │       │
│   │ user_tokens 表    │        └──────────────────┘       │
│   │ (加密Token)       │                                   │
│   └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

### 关键文件清单

| 文件 | 职责 |
|------|------|
| `frontend/src/api/alibabaAPI.ts` | 前端API封装，对接后端路由 |
| `frontend/src/views/SourceCollectionView.vue` | 货源采集页面，搜同类/搜同款入口 |
| `frontend/public/callback.html` | OAuth回调页，部署在云主机 |
| `backend/src/routes/alibabaRoutes.ts` | 后端路由定义 |
| `backend/src/controllers/alibabaController.ts` | 请求处理/参数校验 |
| `backend/src/services/alibabaService.ts` | 核心业务逻辑（签名/调用/解析/降级） |
| `backend/src/utils/crypto.ts` | AES-256-CBC 加解密（Token存储用） |

---

## 二、OAuth 授权流程

### 2.1 流程图

```
用户              前端(Vue)              后端(Express)           1688开放平台          callback.html
 │                  │                       │                      │                    │
 │  点击"授权"      │                       │                      │                    │
 │─────────────────►│                       │                      │                    │
 │                  │  GET /auth/authorize  │                      │                    │
 │                  │──────────────────────►│                      │                    │
 │                  │                       │  生成state=userId:ts │                    │
 │                  │                       │  计算HMAC签名         │                    │
 │                  │  返回managedUrl        │                      │                    │
 │                  │◄──────────────────────│                      │                    │
 │                  │                       │                      │                    │
 │  window.open(managedUrl)                 │                      │                    │
 │───────────────────────────────────────────────────────────────►│                    │
 │                  │                       │           用户登录并授权                    │
 │                  │                       │                      │                    │
 │                  │                       │          302 回调     │                    │
 │                  │                       │                      │───────────────────►│
 │                  │                       │                      │   ?code=xxx&       │
 │                  │                       │                      │   state=userId:ts  │
 │                  │                       │                      │                    │
 │                  │                       │  GET /auth/token     │                    │
 │                  │                       │◄─────────────────────│────────────────────│
 │                  │                       │  ?code=xxx           │                    │
 │                  │                       │  &state=userId:ts    │                    │
 │                  │                       │                      │                    │
 │                  │                       │  从state解析userId    │                    │
 │                  │                       │  POST token换code    │                    │
 │                  │                       │─────────────────────►│                    │
 │                  │                       │  返回access_token    │                    │
 │                  │                       │◄─────────────────────│                    │
 │                  │                       │                      │                    │
 │                  │                       │  AES加密存储到        │                    │
 │                  │                       │  user_tokens表       │                    │
 │                  │                       │                      │                    │
 │                  │                       │  返回成功             │                    │
 │                  │                       │──────────────────────│───────────────────►│
 │                  │                       │                      │                    │ 显示✅授权成功
 │                  │                       │                      │                    │ 3秒后自动关闭
```

### 2.2 授权链接生成

**接口**: `GET /api/alibaba/auth/authorize`

后端生成两种授权链接：
- **标准链接** (`standardUrl`): `https://auth.1688.com/oauth/authorize?response_type=code&client_id={appKey}&redirect_uri={redirectUri}&state={userId}:{timestamp}`
- **托管链接** (`managedUrl`): `https://auth.1688.com/oauth/managed?...` + HMAC-SHA1签名

前端使用 `managedUrl`（含签名，1688优先识别）。

**state 参数**: 编码 `{userId}:{timestamp}`，用于 callback.html 跨域时识别用户（无法携带JWT）。

### 2.3 Token 换取

**接口**: `GET /api/alibaba/auth/token?code={code}&state={userId:ts}`

- 此路由**跳过JWT认证中间件**（放在 `authenticateToken` 之前）
- userId 获取优先级：JWT > state参数解析 > 401拒绝
- 调用 `https://auth.1688.com/oauth/token` 换取 access_token
- Token 加密后存入 `user_tokens` 表

### 2.4 Token 存储

| 字段 | 说明 |
|------|------|
| `userId` | 用户ID |
| `platform` | 固定 `"1688"` |
| `accessToken` | AES-256-CBC 加密后的 token |
| `obtainedAt` | 获取时间 |
| `expiresAt` | 过期时间（约10小时后） |

**注意**: 1688 **不提供 refresh token**，过期后必须重新走授权流程。

### 2.5 Token 状态查询

**接口**: `GET /api/alibaba/auth/status`（需JWT认证）

返回：
```json
{
  "hasToken": true,
  "isExpired": false,
  "remainingSeconds": 32400,
  "obtainedAt": "2026-06-03T10:00:00.000Z",
  "expiresAt": "2026-06-03T20:00:00.000Z"
}
```

前端搜同类/搜同款前会先调用此接口，未配置或过期则提示用户。

### 2.6 callback.html 部署

- **生产路径**: `https://58.87.104.60/callback.html` → 对应 `frontend/dist/callback.html`
- **后端地址获取**: 优先读 `localStorage.backend_url`，否则默认 `http://localhost:3000`
- 因为 JS 在浏览器执行，`localhost` 始终指向用户本机后端
- 修改 callback.html 后需要 `npm run build` 再上传 dist 版本

---

## 三、1688 API 调用机制

### 3.1 通用签名流程

所有 API 调用统一通过 `call1688Api()` 函数：

```
1. 从数据库加载 appKey / appSecret
2. 构造请求路径: param2/1/{namespace}/{api}/{appKey}
3. 生成签名:
   - 签名串 = urlPath + 按key排序后的 key+value 拼接
   - HMAC-SHA1(appSecret, 签名串) → 转16进制大写
4. POST 请求，Content-Type: application/x-www-form-urlencoded
5. Body 包含所有参数 + _aop_signature
```

**请求URL格式**: `https://gw.open.1688.com/openapi/param2/1/{namespace}/{api}/{appKey}`

### 3.2 使用的 1688 API 列表

| 功能 | namespace | API名 | 说明 |
|------|-----------|-------|------|
| 关键词搜索 | `com.alibaba.product` | `product.keyword.search` | 搜同类/通用搜索 |
| 图搜（跨境） | `com.alibaba.fenxiao.crossborder` | `product.search.imageQueryBasic` | 搜同款，主接口 |
| 图搜（公开，降级） | `com.alibaba.product` | `alibaba.public.image.similar.offer.search` | 搜同款，降级接口 |
| 商品详情 | `com.alibaba.fenxiao.crossborder` | `product.search.queryProductDetail` | 获取完整商品信息 |
| Token换取 | - | `https://auth.1688.com/oauth/token` | OAuth标准流程 |

---

## 四、搜索功能详解

### 4.1 搜同类（关键词搜索）

**触发**: 货源采集页商品卡片 → "搜同类" 按钮

**流程**:
```
1. checkAlibabaAuth() 检查Token有效性
2. 使用商品名称作为关键词
3. extractSearchKeywords() 生成降级关键词候选列表:
   - 原始完整名称
   - 中文+英文混合
   - 纯中文字符串
   - 去掉颜色/尺寸/材质等描述词
   - 前2-3个中文片段组合
   - 核心产品词精准提取（如"蓝牙耳机"→"耳机"）
   - 逐步截断
4. tryKeywordSearchWithFallback() 依次尝试每个关键词:
   - 调用 product.keyword.search
   - 参数: param=JSON.stringify({keywords, beginPage, pageSize})
   - 第一个返回结果的即采用
5. parseProductList() 统一解析
6. sortByRelevance() 按关键词相关性排序
```

**API参数**:
```json
{
  "param": "{\"keywords\":\"蓝牙耳机\",\"beginPage\":1,\"pageSize\":20}",
  "access_token": "xxx"
}
```

**关键词降级示例**:
```
"新款无线蓝牙耳机 运动防水入耳式耳机 黑色"
  → "新款无线蓝牙耳机运动防水入耳式耳机黑色"     (中文+英文)
  → "新款无线蓝牙耳机运动防水入耳式耳机"         (去颜色)
  → "新款无线蓝牙耳机"                          (前3段)
  → "无线耳机"                                 (核心词+修饰)
  → "耳机"                                     (核心词)
```

### 4.2 搜同款（图片搜索）

**触发**: 货源采集页商品卡片 → "搜同款" 按钮

**流程**:
```
1. checkAlibabaAuth() 检查Token有效性
2. 获取商品图片URL（支持Ozon CDN地址）
3. 主接口: product.search.imageQueryBasic
   - 参数: searchParam=JSON.stringify({imageAddress, beginPage, pageSize})
   - 注意字段名是 imageAddress，不是 imageUrl
   - 图片URL必须是公网可访问地址
4. 解析结果: result.success=true 且 code=200/SUCCESS 时为成功
5. enrichProductsWithDetail() 补全详情:
   - 图搜API只返回基础字段（subject, image, price）
   - 批量调用 product.search.queryProductDetail 补全:
     · companyInfo (供应商名称/城市/省份)
     · qualityEvaluation (综合/商品/物流评分)
     · offerTradeServiceInfo (服务标签)
     · consignPrice (代发价)
     · yxScoreLevel (买家保障等级)
     · minOrderQuantity (起订量)
6. 如果主接口失败 → 降级到 alibaba.public.image.similar.offer.search
   - 参数: imgUrl=xxx (注意不是 imageAddress)
   - 降级接口也走 enrichProductsWithDetail 补全
```

**主接口参数**:
```json
{
  "searchParam": "{\"imageAddress\":\"https://cdn.ozon.xxx/...\",\"beginPage\":1,\"pageSize\":20}",
  "access_token": "xxx"
}
```

**降级接口参数**:
```json
{
  "imgUrl": "https://cdn.ozon.xxx/...",
  "access_token": "xxx"
}
```

### 4.3 商品详情

**接口**: `GET /api/alibaba/products/:productId`

- 调用 `product.search.queryProductDetail`
- 参数: `offerDetailParam=JSON.stringify({offerId: productId})`
- 失败时返回模拟数据（不阻塞UI）

### 4.4 批量商品信息

**接口**: `POST /api/alibaba/batch`

- 并发调用 `getAlibabaProductDetail`
- 主要用于图搜结果补全（`enrichProductsWithDetail`）

---

## 五、数据解析兼容层

1688 不同 API 返回结构差异很大，`extractProductsFromResponse()` 兼容以下结构：

| 编号 | 结构 | 来源API |
|------|------|---------|
| 1 | `{ result: { success: true, result: [...] } }` | 关键词搜索 |
| 2 | `{ result: { result: [...] } }` | 图搜有结果 |
| 3 | `{ result: [...] }` | 简单列表 |
| 4 | `{ result: { productList/offerList/items: [...] } }` | 搜索变体 |
| 5 | `{ imageSearchResult: [...] }` | 公开图搜 |
| 6 | `{ xxx_response: { result: [...] } }` | SDK风格 |

`parseProductList()` 统一输出格式：

```typescript
{
  id: string,              // 数字offerId
  productId: string,
  subject: string,         // 商品标题
  name: string,            // = subject
  price: number,           // 价格
  consignPrice: number,    // 代发价
  image: string,           // 图片URL
  image_url: string,       // = image
  detail_url: string,      // https://detail.1688.com/offer/{id}.html
  detailUrl: string,       // = detail_url
  supplier_name: string,
  supplier: { name: string },
  city: string,
  province: string,
  location: string,
  quality_score: number,   // 综合质量评分
  quality_detail: {        // 评分明细
    compositeScore: number,
    goodsScore: number,
    logisticsScore: number,
    // ...
  },
  yx_score_level: string,  // 实力商家等级
  trade_services: string[],
  moq: number,             // 起订量
  minOrder: number,        // = moq
}
```

---

## 六、后端路由总览

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/alibaba/auth/token` | ❌ 跳过 | 用code换token（callback.html调用） |
| GET | `/api/alibaba/auth/authorize` | ✅ JWT | 获取授权链接（含签名） |
| GET | `/api/alibaba/auth/status` | ✅ JWT | 查询Token状态 |
| GET | `/api/alibaba/auth/page` | ✅ JWT | 获取授权页面HTML |
| GET | `/api/alibaba/search` | ✅ JWT | 关键词搜索 |
| GET | `/api/alibaba/search/similar` | ✅ JWT | 搜同类（关键词） |
| POST | `/api/alibaba/search/image` | ✅ JWT | 搜同款（图片） |
| GET | `/api/alibaba/products/:productId` | ✅ JWT | 商品详情 |
| POST | `/api/alibaba/batch` | ✅ JWT | 批量商品信息 |
| POST | `/api/alibaba/config` | ✅ JWT | 保存1688配置 |
| GET | `/api/alibaba/suppliers/:supplierId` | ✅ JWT | 供应商信息（模拟数据） |

---

## 七、前端搜索流程

### 搜同类

```
用户点击"搜同类"
  → checkAlibabaAuth() → 失败则 ElMessage.error 并返回
  → alibabaAPI.searchSimilar(keyword, 1, 20)
    → GET /api/alibaba/search/similar?keyword=xxx
  → 结果写入 similarProducts ref → 抽屉展示
```

### 搜同款

```
用户点击"搜同款"
  → checkAlibabaAuth() → 失败则 ElMessage.error 并返回
  → 获取 product.imageUrl || product.image
  → alibabaAPI.searchByImage(imageUrl, undefined, 1, 20)
    → POST /api/alibaba/search/image { imageUrl, page, pageSize }
  → 结果写入 similarProducts ref → 抽屉展示
```

### 采集入库

```
用户点击抽屉中商品的"采集"
  → createProductSelection({ name, price, originalPrice, imageUrl, productUrl })
  → 成功后刷新货源采集库列表
```

---

## 八、配置与密钥管理

### 数据库表

**api_configs 表** — 存储静态配置（不含Token）：
```json
{
  "appKey": "2613751",
  "appSecret": "xxx",
  "redirectUri": "https://58.87.104.60/callback.html",
  "saved_at": "2026/6/3 10:00:00"
}
```

**user_tokens 表** — 存储加密Token：
| 字段 | 类型 | 说明 |
|------|------|------|
| userId | Int | 用户ID |
| platform | String | "1688" |
| accessToken | String | AES-256-CBC加密后的token |
| obtainedAt | DateTime | 获取时间 |
| expiresAt | DateTime | 过期时间 |

### 加解密

- 算法: AES-256-CBC
- 密钥来源: 环境变量 `CRYPTO_KEY`
- 工具: `backend/src/utils/crypto.ts`

---

## 九、已知限制与注意事项

1. **Token有效期约10小时**，1688不提供refresh token，过期需重新授权
2. **图搜图片URL**必须是公网可访问地址，localhost/内网IP无效
3. **日调用限额5000次**，批量详情补全会消耗较多配额
4. **图搜结果需补全**：`imageQueryBasic` 只返回基础字段，需二次调用详情接口
5. **关键词降级**：1688对混合/长关键词可能返回 `success=false`，系统自动逐步简化关键词重试
6. **callback.html部署**：修改后需 `npm run build`，将 `dist/callback.html` 上传到云主机
7. **Mixed Content**：HTTPS的callback.html调用HTTP的localhost API，某些浏览器可能拦截（开发环境可用HTTP版测试）

---

## 十、环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `CRYPTO_KEY` | Token加解密密钥 | 32字节十六进制字符串 |
| `PORT` | 后端端口 | 3000 |
| `DATABASE_URL` | SQLite路径 | file:./dev.db |
