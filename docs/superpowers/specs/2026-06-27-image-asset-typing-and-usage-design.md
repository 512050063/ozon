# 图片素材身份与使用中机制设计

**目标**

为当前图片相关模块建立一套统一、可扩展、可校验的资产管理机制，解决以下问题：

- 上传图片时明确标记业务身份：`头像图` 或 `商品图`
- 从根本上隔离头像图片和商品图片，禁止跨身份复用
- 在素材库中准确判断图片是否“正在使用”
- 对正在使用的图片打标签并禁止删除
- 让头像历史、商品图片选择器、素材库查询三处逻辑统一

**范围**

- 覆盖本地图库上传
- 覆盖头像上传
- 覆盖兰空图床上传
- 覆盖头像历史列表
- 覆盖商品库、商品管理中的图片选择与绑定
- 覆盖素材库中的“使用中”标签与删除校验

**非目标**

- 不在本期处理旧数据的全量自动纠偏脚本细节
- 不在本期改造所有基于 URL 的历史业务字段为图片外键
- 不实现一张图片同时具备多个业务身份

## 业务约束

本设计建立在以下确认过的规则上：

1. 图片业务身份从上传时确定，后续不可变更
2. `头像图` 只能用于头像相关流程
3. `商品图` 只能用于商品相关流程
4. 历史头像只显示当前用户自己上传并归属于头像身份的图片
5. 商品新建、商品编辑、商品管理中的图片选择器，只显示商品图

这意味着图片的“身份”不是临时标签，而是资产的基础属性。

## 现状

### 1. 图片主表能力不足

当前 [backend/prisma/schema.prisma](D:/project/ozon/backend/prisma/schema.prisma:563) 中的 `Image` 模型仅保存文件元数据：

- `userId`
- `fileName`
- `fileUrl`
- `fileSize`
- `fileType`
- `width`
- `height`
- `thumbnailUrl`

当前没有：

- 图片业务身份字段
- 图片来源字段
- 统一引用关系

### 2. 使用中判断过于狭窄

当前 [backend/src/controllers/imageController.ts](D:/project/ozon/backend/src/controllers/imageController.ts:135) 的 `getImages`，以及 [backend/src/controllers/imageController.ts](D:/project/ozon/backend/src/controllers/imageController.ts:636) 和 [backend/src/controllers/imageController.ts](D:/project/ozon/backend/src/controllers/imageController.ts:680) 的使用判断，仅检查：

- `collection_item_images`
- `product_item_images`

这只能覆盖采集库和部分商品库关系，无法覆盖：

- 当前用户头像
- 历史头像
- 商品供应数据中的图片字段
- Ozon 商品编辑流程中的图片数组
- 兰空图床上传后被业务使用的图片

### 3. 图床上传尚未进入本地资产体系

当前 [backend/src/controllers/imageController.ts](D:/project/ozon/backend/src/controllers/imageController.ts:140) 的 `source=imagehost` 列表直接从图床 API 取数据。  
[backend/src/controllers/imageController.ts](D:/project/ozon/backend/src/controllers/imageController.ts:358) 的图床上传逻辑上传成功后返回远程 URL，但未落本地 `Image` 记录。

这会导致：

- 图床图片不是本地一等资产
- 无法统一打“使用中”标签
- 无法统一删除保护
- 无法按头像图 / 商品图做稳定筛选

### 4. 头像上传已写入图片表，但没有业务身份与显式引用

当前 [backend/src/controllers/authController.ts](D:/project/ozon/backend/src/controllers/authController.ts:661) 的头像上传：

- 会创建 `Image` 记录
- 会更新 `user.avatar`
- 会更新 `avatarHistory`

但没有记录：

- 这张图是 `头像图`
- 当前用户头像与该图片的显式引用关系

### 5. 前端选择器按来源过滤，不按业务身份过滤

当前商品图片选择器使用 [frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue](D:/project/ozon/frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue)。

已知调用点包括：

- [frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue](D:/project/ozon/frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue:309)
- [frontend/src/views/ozon/product-management/components/ProductEditDrawer.vue](D:/project/ozon/frontend/src/views/ozon/product-management/components/ProductEditDrawer.vue:333)

当前选择器主要按 `image-source` 区分 `database` / `imagehost`，但还没有按 `头像图` / `商品图` 做业务筛选。

## 方案对比

### 方案 A：仅新增图片身份字段，使用状态实时扫描现有业务表

做法：

- 在 `Image` 增加 `bizType`
- 列表查询时继续扫描头像、商品、采集等业务表计算 `isUsed`

优点：

- 表结构改动小
- 能较快落地

缺点：

- 使用判断分散在多个控制器中
- 新增一个业务位就要补一处扫描逻辑
- 历史头像、图床图片、商品 URL 字段的判断会持续变复杂

### 方案 B：新增图片身份字段，并建立统一引用表

做法：

- 在 `Image` 增加图片身份和来源字段
- 新增 `ImageReference` 记录图片当前被谁使用
- 删除保护和“使用中”标签统一依赖引用表

优点：

- 业务边界清晰
- 查询和删除规则一致
- 后续扩展新业务位时只需增加新的 `refType`

缺点：

- 需要改造上传、绑定、解绑链路
- 需要处理部分历史数据迁移

### 方案 C：在 `Image` 上直接维护 `isUsed`

做法：

- 在 `Image` 上增加 `bizType` 和 `isUsed`
- 每次业务绑定/解绑时手工维护 `isUsed`

优点：

- 列表查询简单

缺点：

- 容易出现脏数据
- 任一业务漏更新就会导致误删或误禁删
- 无法表达“被谁使用”

## 推荐方案

推荐采用 **方案 B：图片身份字段 + 统一引用表**。

原因：

1. 用户已经明确要求头像图和商品图从根本上隔离，单靠查询过滤不够
2. 当前系统图片入口分散，本地图库和图床混用，不建立统一引用层后续无法稳定维护
3. “使用中”标签和禁删规则都属于资产管理问题，应由统一的引用模型承担

## 设计

### 1. 数据模型

#### 1.1 扩展 `Image`

在现有 `Image` 模型基础上新增：

- `bizType`
  - `avatar`
  - `product`
- `provider`
  - `local`
  - `imagehost`

规则：

- `bizType` 创建后不可修改
- 所有图片都必须归属于单一业务身份
- 同一图片不允许既是头像图又是商品图

说明：

当前 `Image.userId` 已具备上传归属用户含义，因此本期继续使用 `userId` 作为图片所有者字段，不新增 `ownerUserId`。

#### 1.2 新增 `ImageReference`

新增统一引用表 `ImageReference`，用于记录“这张图当前被哪类业务使用”。

建议字段：

- `id`
- `imageId`
- `userId`
- `refType`
- `refId`
- `refKey`
- `createdAt`
- `updatedAt`

建议索引：

- `@@index([imageId])`
- `@@index([userId, refType])`
- `@@unique([imageId, refType, refId, refKey])`

其中：

- `refType` 用于标识业务位，例如：
  - `user_avatar`
  - `product_item_main`
  - `product_item_gallery`
  - `collection_item_main`
  - `collection_item_gallery`
  - `product_supply_main`
  - `product_supply_gallery`
  - `ozon_product_main`
  - `ozon_product_gallery`
- `refId` 为业务主键
- `refKey` 为可选补充位，例如图片顺序、字段名、历史槽位等

#### 1.3 关于历史头像

历史头像不建议作为 `ImageReference` 的“使用中”来源。

原因：

- 历史头像的本质是可回选记录，不是当前有效绑定
- 若把历史头像也视为“使用中”，用户将几乎无法清理头像库

因此本设计规定：

- `user.avatar` 的当前头像引用，计入 `ImageReference`
- `avatarHistory` 仅作为历史列表来源，不计入“使用中”

### 2. 上传与入库规则

#### 2.1 头像上传

当前入口位于 [backend/src/controllers/authController.ts](D:/project/ozon/backend/src/controllers/authController.ts:661)。

改造后行为：

1. 上传成功后创建 `Image`
2. 写入：
   - `bizType = avatar`
   - `provider = local`
3. 更新 `user.avatar`
4. 更新 `avatarHistory`
5. 为当前头像写入 `ImageReference(refType = user_avatar)`
6. 若用户之前已有当前头像引用，则移除旧的 `user_avatar` 引用后再写新引用

#### 2.2 本地图库上传

本地图库上传必须区分调用场景。

规则：

- 若入口来自头像模块，写 `bizType = avatar`
- 若入口来自商品相关模块，写 `bizType = product`

为避免前端绕错，上传接口需要显式接收并校验一个受限参数，例如：

- `bizType=avatar`
- `bizType=product`

后端必须校验该字段，不能仅靠前端约定。

#### 2.3 兰空图床上传

图床上传成功后，不能只返回远程 URL，必须同时在本地创建 `Image` 记录。

写入规则：

- `bizType` 由上传入口决定
- `provider = imagehost`
- `fileUrl` 存远程 URL
- `thumbnailUrl` 存远程缩略图（若有）

这样图床图片也能进入统一资产管理体系。

### 3. 使用中判定规则

#### 3.1 头像图

当 `bizType = avatar` 时：

- 存在 `ImageReference(refType = user_avatar)`，则视为“使用中”
- 仅历史头像存在于 `avatarHistory`，不视为“使用中”

结果：

- 当前头像禁止删除
- 历史头像允许删除

#### 3.2 商品图

当 `bizType = product` 时：

- 只要存在任意商品相关 `ImageReference`，即视为“使用中”

首期纳入的引用类型应至少覆盖：

- `collection_item_main`
- `collection_item_gallery`
- `product_item_main`
- `product_item_gallery`
- `product_supply_main`
- `product_supply_gallery`
- `ozon_product_main`
- `ozon_product_gallery`

即使某些业务目前仍保存 URL 数组，本期也应在保存业务数据时同步建立图片引用。

#### 3.3 素材库返回结构

素材库图片列表接口返回时，应直接附带：

- `bizType`
- `provider`
- `isUsed`
- `usedRefCount`
- `usedRefTypes`（可选，首期可只返回简略数组）

前端不再自行拼凑使用状态。

### 4. 删除规则

#### 4.1 后端是唯一准入判断

删除前必须以后端实时校验 `ImageReference` 为准。

即便前端列表显示可删，提交删除时后端仍需再次检查，防止并发误删。

#### 4.2 头像图删除

- 当前头像：禁止删除
- 历史头像：允许删除

删除历史头像后：

- 从 `avatarHistory` 中移除对应 URL
- 素材库列表同步不再显示该记录，或走软删除
- 前端历史头像槽位自动前补
- 不足五个位置时显示空占位“无”

#### 4.3 商品图删除

- 存在任意 `ImageReference` 时禁止删除
- 无引用时允许删除

前端交互：

- 显示“使用中”标签
- 删除按钮置灰或隐藏

但无论前端如何表现，后端都必须再次校验。

### 5. 查询与可见性规则

#### 5.1 头像模块

头像历史查询规则：

- 仅查询 `bizType = avatar`
- 仅查询当前用户 `userId`
- 按创建时间倒序
- 返回前五条

如果不足五条：

- 前端补空位
- 空位显示“无”

#### 5.2 商品图片选择器

商品新建、编辑、管理中的图片选择器统一增加业务过滤：

- `where bizType = product`

若界面还要区分本地图库和图床图库，则在此基础上再叠加：

- `provider = local`
- 或 `provider = imagehost`

但不允许返回任何 `avatar` 图片。

#### 5.3 素材库

素材库建议增加统一筛选项：

- 图片类型：全部 / 头像图 / 商品图
- 来源：全部 / 本地 / 图床
- 状态：全部 / 使用中 / 未使用

### 6. 迁移与兼容策略

#### 6.1 存量图片数据

现有 `images` 表中缺少业务身份，需要补数据。

建议规则：

- 被 `user.avatar` 或 `avatarHistory` 命中的图片，补为 `avatar`
- 被 `collection_item_images` 或 `product_item_images` 命中的图片，补为 `product`
- 若同一图片同时命中头像和商品，按异常数据处理，列入迁移日志人工确认
- 既未命中头像也未命中商品的存量图片，可按来源和上传入口推断；若仍无法推断，列入迁移异常清单，人工确认后再补写身份

本期不引入 `unknown` 作为正式状态。  
无法判定身份的存量图片，不允许带着空身份或未知身份直接上线。

#### 6.2 存量业务引用

`ImageReference` 的初始化建议分两部分：

1. 根据 `collection_item_images`、`product_item_images` 回填
2. 根据当前 `user.avatar` 回填 `user_avatar`

`avatarHistory` 不回填为使用引用。

对于仍以 URL 数组保存的商品图业务，可在对应保存接口改造后逐步进入显式引用，不要求一次性全覆盖旧历史数据，但新数据必须从改造点起写入引用表。

### 7. 接口改造建议

#### 7.1 图片上传接口

统一支持以下入参：

- `bizType`
- `provider` 由后端按接口场景决定或内部补全

返回统一图片对象，包含：

- `id`
- `fileUrl`
- `thumbnailUrl`
- `bizType`
- `provider`

#### 7.2 素材库列表接口

支持过滤：

- `bizType`
- `provider`
- `usedStatus`

#### 7.3 删除接口

删除接口返回需明确区分：

- `success=false` + `message=图片正在使用，禁止删除`
- `success=true`

必要时可附带：

- `usedRefTypes`

便于前端后续显示更精确提示。

### 8. 前端改造建议

#### 8.1 头像模块

当前 [frontend/src/views/settings/account-info/components/AvatarEditor.vue](D:/project/ozon/frontend/src/views/settings/account-info/components/AvatarEditor.vue) 已具备历史头像槽位 UI。

改造方向：

- 历史头像数据源改为头像类型图片列表，而不是只依赖裸 URL 数组
- 仍可保留 `avatarHistory` 作为排序或兼容来源
- 删除按钮仅对非当前头像显示可操作

#### 8.2 图片选择器

当前 `ImageGalleryPicker` 需新增业务过滤参数，例如：

- `biz-type="product"`

头像相关如需复用图片选择器，则必须传：

- `biz-type="avatar"`

选择器内部不允许默认放开全部图片。

#### 8.3 素材库列表

素材库图片卡片增加：

- 图片类型标识
- “使用中”标签
- 删除禁用态

### 9. 错误处理

- 上传时未传 `bizType`：返回 400
- 上传时传入非法 `bizType`：返回 400
- 删除正在使用图片：返回 400 或 409
- 商品模块尝试绑定 `avatar` 图片：返回 400
- 头像模块尝试绑定 `product` 图片：返回 400

后端必须对跨身份绑定做硬校验，不能只依赖前端筛选。

### 10. 测试重点

#### 10.1 后端

- 头像上传后写入 `bizType=avatar`
- 商品图上传后写入 `bizType=product`
- 图床上传后同步创建本地 `Image`
- 当前头像会生成唯一 `user_avatar` 引用
- 更换头像时旧引用被清理，新引用被写入
- 历史头像删除不影响当前头像
- 商品图被引用时删除失败
- 商品图未被引用时删除成功
- 商品接口不能绑定 `avatar` 图片
- 头像接口不能绑定 `product` 图片

#### 10.2 前端

- 历史头像只显示当前用户头像图，最多五个
- 空位显示“无”
- 商品图片选择器只显示 `product` 图片
- 素材库可按图片类型和使用状态筛选
- 正在使用的图片显示标签，且不可删除

## 分阶段实施建议

### 第一阶段：建模与接口收口

- 扩展 `Image`
- 新增 `ImageReference`
- 改造上传接口写入 `bizType` 和 `provider`

### 第二阶段：核心绑定链路改造

- 改造头像上传与头像切换逻辑
- 改造商品库、商品管理图片保存逻辑
- 在保存时同步维护 `ImageReference`

### 第三阶段：查询、禁删和前端筛选

- 改造素材库列表
- 改造删除校验
- 改造头像历史列表
- 改造商品图片选择器

### 第四阶段：存量数据迁移

- 回填 `bizType`
- 回填 `ImageReference`
- 输出异常数据清单

## 最终结论

本设计采用“**图片身份**”与“**业务引用**”分离的建模方式：

- `Image` 负责回答：这张图是什么
- `ImageReference` 负责回答：这张图现在被谁使用

这样可以稳定满足以下目标：

- 头像图与商品图彻底隔离
- 历史头像仅显示本人头像资产
- 商品选择器只显示商品图
- 素材库准确打“使用中”标签
- 正在使用的图片禁止删除

这是当前代码结构下最稳、后续维护成本最低的落地方案。
