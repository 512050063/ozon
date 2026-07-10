# 商品库添加商品信息改造设计

日期：2026-06-24

## 背景

商品库的“添加商品信息”需要模仿 Ozon 添加商品流程：选择商品类目和类型后，根据 Ozon 返回的真实模板渲染不同字段。当前实现已有抽屉、浮动标签、类目选择、属性缓存和动态 `AttributeField`，但仍是单 SKU 表单，且变体/隐藏特征主要靠字段名称启发式拆分。

## 范围

本次首版只完成“保存到商品库”，不在保存时直接提交 Ozon 上架。商品库列表已有单独的上架按钮，后续上架继续以列表中的单条记录为单位执行。

添加模式支持多 SKU 批量录入。保存时，每个 SKU 拆成一条 `ProductSupply` 记录，因此如果一个商品有 2 个 SKU，商品库列表显示 2 条商品信息。编辑模式不支持多 SKU，只编辑当前这一条商品记录。

## 关键规则

1. 本地保存时不根据变体自动改商品名。多条 SKU 记录的 `name` 均保存用户填写的基础商品名。
2. SKU 差异通过 `variantAttributes` / `attributes` 保存，并在列表商品信息下方显示变体摘要，例如 `颜色：黑色 / 尺寸：标准版`。
3. 每条 SKU 独立保存货号 `offer_id`、条形码、价格、折扣前价格、属性、图片和上架状态。
4. 商品信息和尺寸重量为所有类型通用字段。变体特征和隐藏特征由 Ozon 类目/类型模板决定。
5. 提示文字、选中偏移、红框错误样式复用当前“商品名称”的浮动标签视觉规范。

## 推荐方案

采用“模板缓存 + 添加时 SKU 矩阵 + 保存时展开为多条商品记录”。

保留现有 `OzonCategoryAttribute` 和 `OzonAttributeValue` 作为可复用属性和值缓存。新增模板快照表保存某个 `descriptionCategoryId + typeId` 的规范化表单结构。`ProductSupply` 补齐单 SKU 所需字段和 JSON 快照，列表、编辑、删除、上架继续沿用单条记录逻辑。

不采用持久化父商品/子 SKU 层级，因为用户明确要求列表中一个 SKU 就是一条记录，编辑也只涉及单条商品。

## 数据模型

新增 `OzonProductTemplate`：

- `id`
- `descriptionCategoryId`
- `typeId`
- `language`
- `templateJson`：规范化后的模板结构，包括分区、字段、提示、必填、选项引用、SKU 维度候选等
- `rawAttributes`：Ozon 属性接口原始响应备份
- `source`
- `cachedAt`
- `createdAt`
- `updatedAt`

扩展 `ProductSupply`：

- `barcode`：条形码
- `oldPrice`：折扣前价格
- `descriptionCategoryId`：Ozon 二级描述类目 ID
- `typeId`：Ozon 类型 ID
- `images`：图片 URL/ID 列表 JSON
- `attributes`：提交 Ozon 所需的属性值 JSON
- `variantAttributes`：当前 SKU 的变体字段 JSON
- `hiddenAttributes`：隐藏特征 JSON
- `templateSnapshot`：保存时使用的模板快照 JSON
- `variantSummary`：列表展示用摘要 JSON 或字符串，例如 `颜色：黑色 / 尺寸：标准版`

保留现有字段 `name`、`category`、`brand`、`modelName`、`price`、`imageUrl`、`description`、`alibabaId`。其中 `alibabaId` 在商品库语义中作为货号/offer_id 使用，后续可以在接口层兼容命名，避免一次性大面积重命名。

## 后端接口

### 获取模板

`GET /api/product-supply/templates?descriptionCategoryId=...&typeId=...&language=ZH_HANS`

流程：

1. 查 `OzonProductTemplate` 缓存。
2. 缓存有效则返回规范化模板。
3. 缓存缺失或强制刷新时，调用 Ozon `description-category` 属性接口获取真实字段。
4. 对有字典的字段调用 Ozon 属性值接口并保存 `OzonAttributeValue`。
5. 生成前端可渲染模板并保存。

返回结构：

- `baseFields`：固定商品信息字段说明
- `dimensionFields`：固定尺寸重量字段说明
- `variantAttributes`：变体特征字段
- `hiddenAttributes`：隐藏特征字段
- `skuDimensionCandidates`：可作为 SKU 维度的字段
- `requiredAttributeIds`
- `source`
- `cachedAt`

### 创建商品

`POST /api/product-supply`

新增支持批量 SKU payload：

- `base`：商品信息、图片、类目、品牌、型号、尺寸重量、公共属性
- `skus`：每个 SKU 的 `offerId`、`barcode`、`price`、`oldPrice`、`variantAttributes`、`attributes`
- `templateSnapshot`

后端在事务中按 `skus[]` 创建多条 `ProductSupply`。如果没有传 `skus`，按单 SKU 兼容旧逻辑。

### 编辑商品

`PUT /api/product-supply/:id`

只更新单条 `ProductSupply`。编辑页不生成 SKU 矩阵，不批量创建或合并 SKU。

## Ozon API 说明

模板数据必须来自 Ozon Seller API 的真实类目/属性接口，不使用静态模拟字段。现有后端已经调用：

- `/v1/description-category/tree`
- `/v1/description-category/attribute`
- `/v1/description-category/attribute/values`

实现时需要修正属性值拉取参数，确保使用真实 `attribute_id`，并带上 `description_category_id`、`type_id`、分页参数等 Ozon 当前接口需要的字段。不要把 `dictionary_id` 误当作属性 ID 直接传给 `attribute_id`。

后续上架 payload 应按新版商品导入接口准备，一条本地 SKU 记录对应 Ozon `items[]` 中的一条 item。

## 前端设计

### AddProductDrawer

保留当前右侧抽屉和浮动标签样式，按功能拆分：

- `ProductBaseSection`：名称、图片、类目/类型、品牌、型号
- `PackageSection`：长宽高、重量
- `TemplateAttributeSection`：动态字段渲染，复用增强后的 `AttributeField`
- `SkuMatrixSection`：仅新增模式显示，选择 SKU 维度并生成 SKU 行
- `HiddenAttributesSection`：隐藏特征，必填优先显示，其他折叠

### 新增模式

1. 用户填写基础字段。
2. 选择 Ozon 类目/类型。
3. 前端调用模板接口。
4. 模板加载后渲染变体特征和隐藏特征。
5. 用户选择颜色、尺寸等 SKU 维度和取值。
6. 前端生成 SKU 行，每行填写货号、条形码、价格、折扣前价格。
7. 保存时提交 `base + skus + templateSnapshot`。

### 编辑模式

1. 加载当前 `ProductSupply`。
2. 使用保存的 `templateSnapshot` 或当前模板渲染字段。
3. 不展示 SKU 矩阵。
4. 只编辑当前记录的 `offerId`、条形码、价格、折扣前价格、属性和隐藏特征。

### 列表展示

`ProductLibraryList` 在商品名称下方增加变体摘要行。商品名称保持基础名称，不拼接颜色/尺寸。

## 字段分类

首版仍可参考现有 `attributeCategorizer` 的关键词逻辑，但后端模板服务需要成为唯一分类出口。前端不直接决定字段属于变体还是隐藏。

后端分类规则：

1. Ozon 返回的必填字段优先展示。
2. 明确常见变体字段进入 `skuDimensionCandidates`，如颜色、尺寸、款式、容量等。
3. 标题、描述、标签等非 SKU 差异字段作为公共变体特征。
4. 其余字段进入隐藏特征。
5. 保存模板快照，避免同一商品后续因模板变化无法复现表单。

## 校验与错误处理

前端校验：

- 基础必填：名称、图片、类目/类型、品牌、型号
- 尺寸重量：长宽高重量必须大于 0
- 模板必填：按 Ozon `is_required` 校验
- SKU 行：货号、价格必填；条形码按模板或业务要求校验
- 多 SKU：至少 1 行；`offerId` 不允许重复

错误展示：

- 字段红框、红色提示沿用浮动标签样式。
- 隐藏特征缺失必填时自动展开并定位。
- 顶部或底部保留错误摘要，可点击定位字段。

后端校验：

- 请求结构校验
- 用户权限校验
- SKU 货号去重
- Ozon 类目/类型字段完整性校验
- 批量创建使用事务，任一 SKU 失败则整体失败

## 测试范围

后端：

- 模板缓存命中/未命中
- Ozon 属性值分页与缓存
- 单 SKU 兼容创建
- 多 SKU 批量创建并展开为多条 `ProductSupply`
- 事务失败回滚
- 编辑单条记录不影响其他 SKU

前端：

- 类目选择后加载模板
- 字段浮动标签和错误样式
- SKU 维度选择和矩阵生成
- 多 SKU 保存 payload
- 编辑模式不显示 SKU 矩阵
- 列表展示变体摘要

## 非目标

- 本次不在保存时自动上架 Ozon。
- 本次不做父商品/子 SKU 层级管理。
- 本次不做 SKU 合并、复制、批量改价等高级 SKU 管理。
- 本次不重构整套商品库列表和上架状态体系。
