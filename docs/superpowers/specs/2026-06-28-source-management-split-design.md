# 货源采集拆分与货源管理设计

## 背景

当前 `货源采集` 页面实际承担的是 Ozon 优选保存商品卡的管理，数据来自 `ProductSelection`。页面中的 `搜同款`、`搜同类` 功能已经跑通：从 1688 获取候选货源后，用户点击采集会创建商品库记录 `ProductSupply`，并同步写入或复用 1688 货源表 `SupplySource`。

用户确认采用基础版拆分方案：保留现有搜同款/搜同类保存行为不变，新建 `货源管理` 用来统一管理已保存的 1688 商品信息。

## 目标

1. 将左侧菜单中的 `货源采集` 改为父菜单，拆分为 `商品采集` 和 `货源管理` 两个子菜单。
2. `商品采集` 复用当前 `货源采集` 页面能力，不修改已跑通的搜同款、搜同类业务逻辑。
3. 新增 `货源管理` 页面，管理 `SupplySource` 表中的 1688 货源商品。
4. 更新角色管理权限树，让管理员能分别授权 `商品采集` 和 `货源管理`。
5. 保留旧路由和旧权限的兼容，避免现有账号突然失去菜单入口。

## 非目标

1. 不重写 1688 搜同款、搜同类 API。
2. 不改变搜同款/搜同类保存行为。保存仍然进入商品库，并写入或复用 `SupplySource`。
3. 不在本期实现货源与商品库 SKU 的反向绑定关系视图。
4. 不改商品库上架、Ozon 模板、商品管理模块。

## 菜单与路由

新增路由结构：

| 路由 | 页面 | 权限码 |
| --- | --- | --- |
| `/source-collection` | 重定向到 `/source-collection/product-collection` | `source-collection` |
| `/source-collection/product-collection` | 商品采集 | `source-collection/product-collection` |
| `/source-collection/supply-management` | 货源管理 | `source-collection/supply-management` |

兼容策略：

1. 旧权限码 `source-collection` 作为父权限和兼容权限保留。
2. 如果用户只有旧权限码 `source-collection`，前端菜单允许看到 `商品采集` 和 `货源管理`。
3. 路由守卫接受旧权限码访问两个新子路由。
4. 角色管理保存权限时，以新叶子权限为主；旧权限只作为兼容读取。

## 前端页面设计

### 商品采集

当前 `frontend/src/views/source-collection/Index.vue` 作为商品采集页面继续使用。可以选择直接复用原文件，也可以新建轻量路由入口引用同一组件。

行为保持不变：

1. 展示 Ozon 优选保存的商品卡。
2. 支持商品卡搜索、删除、类目选择。
3. 支持搜同类、搜同款。
4. 搜同款/搜同类结果点击采集后，继续调用现有创建商品库逻辑，写入 `ProductSupply` 和 `SupplySource`。

### 货源管理

新增页面建议路径：`frontend/src/views/source-collection/supply-management/Index.vue`。

基础功能：

1. 顶部搜索：按 1688 商品 ID、商品标题、供应商名称搜索。
2. 添加货源：输入 1688 链接或 offerId，调用后端解析接口，预览后确认保存。
3. 货源列表：展示主图、标题、价格、起订量、供应商、地区、更新时间。
4. 详情跳转：点击货源卡或外链按钮打开 1688 商品详情页。
5. 编辑货源：允许编辑标题、价格、代发价、供应商、地区、详情链接、主图等本地字段。
6. 删除货源：删除未绑定或已绑定货源时给出确认提示。本期可以只删除 `SupplySource` 记录，商品库 `ProductSupply.supplySourceId` 依赖 `onDelete: SetNull` 置空。

UI 风格：

1. 页面容器、搜索区和按钮样式沿用当前货源采集/商品库的通用样式。
2. 添加货源弹窗复用商品库货源绑定弹窗中已经调整过的模块标题、tab/输入框/按钮风格。
3. 链接解析应先弹窗，再进入加载状态，避免用户误以为页面卡死。

## 后端 API 设计

新增专用路由：`/api/supply-sources`。

接口：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/supply-sources` | 查询当前用户保存的 1688 货源 |
| `POST` | `/api/supply-sources/preview-url` | 解析 1688 链接并返回预览，不保存 |
| `POST` | `/api/supply-sources/from-url` | 解析 1688 链接并保存或覆盖同 offerId 货源 |
| `PUT` | `/api/supply-sources/:id` | 编辑本地货源字段 |
| `DELETE` | `/api/supply-sources/:id` | 删除当前用户货源 |

复用策略：

1. 复用 `productSupplySourceResolver.ts` 的 offerId 提取、1688 详情解析和归一化能力。
2. 将 `productSupplyController.ts` 中 `SupplySource` 的构造、复用、覆盖逻辑抽到独立 service，避免商品库控制器和货源管理控制器重复实现。
3. 保留商品库现有接口：
   - `GET /api/product-supply/sources`
   - `POST /api/product-supply/source/preview-url`
   - `PUT /api/product-supply/:id/source`
   - `POST /api/product-supply/:id/source/from-url`
   - `DELETE /api/product-supply/:id/source`
4. 商品库接口后续可内部调用同一 service，但不作为货源管理页面的主入口。

## 数据模型

继续使用现有 `SupplySource` 表：

1. `@@unique([userId, alibabaOfferId])` 用于按用户和 1688 商品 ID 去重。
2. 添加或链接导入时，如果同一用户已有相同 `alibabaOfferId`，更新已有记录。
3. 多个商品库 SKU 可以绑定同一条 `SupplySource`。
4. 本期不新增表。

## 权限设计

角色管理权限树调整：

```text
货源采集
  商品采集 source-collection/product-collection
  货源管理 source-collection/supply-management
```

权限判断规则：

1. 父菜单 `source-collection` 在用户拥有父权限、商品采集权限、货源管理权限任一项时显示。
2. 子菜单在拥有对应子权限时显示。
3. 为兼容旧角色，拥有父权限 `source-collection` 时两个子菜单都显示。
4. 新建角色默认权限不额外增加货源相关权限，仍保持当前默认最小权限。

## 错误处理

1. 1688 未授权或 token 失效时，货源管理页面提示用户先完成 1688 授权。
2. 链接无法提取 offerId 时，提示 `请输入有效的1688商品链接或商品ID`。
3. 解析成功但信息不完整时，允许保存可用字段，并在预览区显示缺失字段提示。
4. 保存同 offerId 货源时走覆盖更新，不提示重复错误。
5. 删除货源前弹确认框，说明绑定商品会变为无货源。

## 验证方案

前端验证：

1. 访问 `/source-collection`，应跳转到 `/source-collection/product-collection`。
2. 左侧菜单显示 `货源采集` 父菜单和两个子菜单。
3. 商品采集页面的搜同款、搜同类、采集到商品库行为保持不变。
4. 货源管理页面能查询、搜索、链接解析、保存、编辑、删除货源。
5. 权限树能显示并保存两个新子权限。

后端验证：

1. `GET /api/supply-sources` 返回当前用户货源，不返回其他用户数据。
2. `POST /api/supply-sources/from-url` 对同一 `alibabaOfferId` 重复调用只更新同一条记录。
3. `DELETE /api/supply-sources/:id` 只能删除当前用户货源。
4. 商品库原货源绑定接口仍可用。

浏览器验证：

1. 在 `http://localhost:5173/source-collection/product-collection` 验证商品采集页面。
2. 在 `http://localhost:5173/source-collection/supply-management` 验证货源管理页面。
3. 检查浏览器控制台无新增阻塞错误。
