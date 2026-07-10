# 内置图片资产与 Ozon 上架图片地址设计

## 目标

项目部署到云主机后，不再依赖兰空图床或其他第三方图床。系统保留图片上传、素材库、商品图选择和使用中管理能力，但图片统一存储在本系统服务器，并通过当前站点公网 HTTPS 地址提供给 Ozon 上架接口。

核心目标：

- 删除“图片托管/兰空图床”配置与外部图床 API 调用。
- 商品图上传后直接成为系统内置图片资产。
- Ozon 上架时使用系统公网图片 URL，而不是二次上传到图床。
- 安装/部署检测必须验证图片公网访问能力。
- 头像图与商品图继续保持业务隔离，素材库继续支持使用中判断和删除保护。

## 背景

当前本地开发时，商品图片常以 `/images/...` 等本地路径保存。Ozon 商品上架接口需要 `primary_image` 和 `images` 字段是 Ozon 可访问的 `http/https` 图片地址。因此旧逻辑在上架前调用兰空图床，把本地图片转成公网 URL。

部署到云主机后，应用本身已经具备公网域名和 Nginx 静态文件服务，第三方图床不再是必要依赖。继续保留兰空图床会带来额外配置、故障点、隐私风险和部署复杂度。

## 当前依赖点

### 后端

- [backend/src/controllers/imageController.ts](D:/project/ozon/backend/src/controllers/imageController.ts)
  - 同时处理 `source=local` 和 `source=imagehost`。
  - `imagehost` 分支调用兰空图床 token、列表、上传、删除接口。
- [backend/src/services/imageAssetService.ts](D:/project/ozon/backend/src/services/imageAssetService.ts)
  - `IMAGE_PROVIDERS` 当前包含 `local`、`imagehost`。
  - 商品图片引用查找目前偏向 `provider=imagehost`。
- [backend/src/services/ozonProductService.ts](D:/project/ozon/backend/src/services/ozonProductService.ts)
  - `convertProductImagesToImageHost()` 在上架前把 `/images/...` 上传到兰空图床。
  - `buildOzonImageUrls()` 要求最终图片必须是 `http/https`。
- [backend/src/controllers/apiConfigController.ts](D:/project/ozon/backend/src/controllers/apiConfigController.ts)
  - 存在 `platform === 'image-host'` 的连接测试。
- [backend/prisma/schema.prisma](D:/project/ozon/backend/prisma/schema.prisma)
  - `ImageProvider` 仍包含 `imagehost`。

### 前端

- [frontend/src/views/settings/api-config/Index.vue](D:/project/ozon/frontend/src/views/settings/api-config/Index.vue)
  - API 配置页有“图片托管”页签。
- [frontend/src/views/warehouse/material-library/Index.vue](D:/project/ozon/frontend/src/views/warehouse/material-library/Index.vue)
  - 素材库可能按 `database/imagehost` 来源切换。
- [frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue](D:/project/ozon/frontend/src/views/warehouse/material-library/components/ImageGalleryPicker.vue)
  - 商品图选择器仍支持 `image-source="imagehost"`。
- [frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue](D:/project/ozon/frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue)
  - 商品新增抽屉当前有图床来源参数。

## 设计决策

采用“内置图片资产服务”，删除第三方图床业务能力。

### 1. 图片存储

图片上传到服务器持久目录，不放在前端源码目录。

建议目录：

```text
/opt/ozon/data/uploads/images
```

本地开发可通过环境变量覆盖，例如：

```text
UPLOAD_ROOT=D:/project/ozon/.data/uploads
```

后端生成内部路径：

```text
/uploads/images/<fileName>
```

数据库 `Image.fileUrl` 建议保存该相对路径，避免域名变更时批量改库。

### 2. 公网 URL 生成

新增统一工具函数：

```text
resolvePublicAssetUrl(fileUrl)
```

规则：

- 如果 `fileUrl` 已经是 `http/https`，直接返回。
- 如果是 `/uploads/images/...` 或兼容旧 `/images/...`，拼接公网基础地址。
- 公网基础地址优先来自环境变量 `PUBLIC_BASE_URL`。
- 若未配置，则可从请求头推断只用于页面展示；Ozon 上架必须要求显式配置。

示例：

```text
PUBLIC_BASE_URL=https://example.com
/uploads/images/a.jpg -> https://example.com/uploads/images/a.jpg
```

### 3. Ozon 上架图片处理

`convertProductImagesToImageHost()` 改名为：

```text
resolveProductImagesForOzon()
```

新职责：

- 收集商品主图和图片数组。
- 兼容历史本地路径 `/images/...`、`/assets/images/product-images/...`。
- 转换为公网 HTTPS URL。
- 校验最终 URL 必须是 `http/https`。
- 不再上传到兰空图床。

失败条件：

- 图片为空。
- 图片路径无法映射为公网地址。
- `PUBLIC_BASE_URL` 未配置。
- 配置的公网地址不是 `https`，生产环境应拒绝上架。

### 4. 素材库与图片管理

素材库保留，但语义从“图床管理”改为“图片素材库”。

保留能力：

- 上传图片。
- 图片列表。
- 选择商品图片。
- 删除未使用图片。
- 使用中标签。
- 头像图/商品图隔离。

移除能力：

- `source=imagehost`。
- 兰空图床 token。
- 兰空图床远程列表同步。
- 兰空图床远程删除。
- API 配置页“图片托管”。

### 5. 数据模型

短期兼容：

- 暂时保留数据库枚举 `ImageProvider.imagehost`，避免存量数据迁移阻塞上线。
- 后端新写入只允许 `provider=local`。
- 前端不再暴露图床来源。
- 对已有 `imagehost` 图片记录，只读展示，不再新增、不再远程删除。

中期清理：

- 提供迁移脚本：
  - 能下载旧图床图片的，迁移到 `/uploads/images`，更新 `fileUrl` 和 `provider=local`。
  - 无法下载的，保留原 URL 作为外链图片，标记迁移异常。
- 存量清理完成后，再从 Prisma 枚举中删除 `imagehost`。

### 6. 部署和安装检测

安装页或部署检测新增“图片公网访问”步骤：

1. 检查 `PUBLIC_BASE_URL` 是否配置。
2. 检查 `PUBLIC_BASE_URL` 是否为 HTTPS。
3. 写入一张测试图片到上传目录。
4. 通过公网 URL 请求该图片。
5. 校验响应状态为 200，`Content-Type` 为图片类型。
6. 检查 Nginx `/uploads/` 静态访问配置。

检测失败时，明确提示：

- 未配置公网地址。
- 域名无法访问。
- HTTPS 未启用。
- 上传目录不可写。
- Nginx 未暴露 `/uploads/`。

### 7. Nginx

推荐 Nginx 直接服务静态图片目录：

```nginx
location /uploads/ {
    alias /opt/ozon/data/uploads/;
    access_log off;
    expires 30d;
}
```

如果继续代理到 Node，也可以运行，但生产推荐 Nginx 静态服务，减少后端压力。

### 8. 兼容旧路径

为了避免旧数据马上失效，保留兼容：

- `/images/...` 继续可访问。
- `/assets/images/product-images/...` 继续可访问。
- Ozon 上架时旧路径统一转换为公网 URL。

新上传只写：

```text
/uploads/images/...
```

### 9. 错误处理

Ozon 上架前如果图片无法转换为公网 URL，错误文案应直接说明原因：

- `商品图片不是公网地址，请先完成图片公网访问配置`
- `PUBLIC_BASE_URL 未配置，无法生成 Ozon 图片地址`
- `图片文件不存在，无法上架`
- `生产环境要求 HTTPS 图片地址`

不要再提示“请配置兰空图床”。

## 非目标

- 不再接入新的第三方对象存储或 CDN。
- 不在第一阶段物理删除所有历史 `imagehost` 数据。
- 不在第一阶段删除 Prisma 枚举中的 `imagehost`，避免迁移成本过高。
- 不改变 Ozon API 本身的图片字段结构。

## 分阶段实施

### 第一阶段：切断第三方图床新增路径

- 删除 API 配置页“图片托管”页签。
- 删除 `apiConfigController` 的 `image-host` 测试逻辑。
- 图片上传接口忽略或拒绝 `source=imagehost`。
- 前端所有商品图片选择器改为本地图片库。

### 第二阶段：Ozon 上架图片 URL 重构

- 新增公网 URL 解析工具。
- `convertProductImagesToImageHost()` 改为 `resolveProductImagesForOzon()`。
- 删除上架前上传兰空图床逻辑。
- 上架和商品更新都使用公网 URL 解析结果。

### 第三阶段：部署检测

- 安装页新增图片公网访问检测。
- 部署文档和 Nginx 示例改为 `/uploads/` 静态目录。
- 增加 `.env.example` 中的 `PUBLIC_BASE_URL`、`UPLOAD_ROOT`。

### 第四阶段：存量数据迁移

- 扫描 `images.provider=imagehost`。
- 下载可用远程图片到本地上传目录。
- 更新图片 URL 和 provider。
- 输出失败清单。

## 测试重点

- 本地图片上传后写入 `/uploads/images/...`。
- 商品新增选择图片后保存相对路径。
- Ozon 上架时相对路径转换成 `PUBLIC_BASE_URL` 下的 HTTPS URL。
- 未配置 `PUBLIC_BASE_URL` 时，上架失败且提示明确。
- `source=imagehost` 上传请求被拒绝。
- API 配置页面不再出现图片托管。
- 素材库不再出现图床来源切换。
- 旧 `/images/...` 数据仍可展示并可被转换为公网 URL。

## 结论

第三方图床模块应删除，但图片资产模块应保留并内置化。项目上云后，服务器本身就是图片公开服务的来源；Ozon 上架需要的不是“图床”这个产品形态，而是稳定、HTTPS、可公网访问的图片 URL。
