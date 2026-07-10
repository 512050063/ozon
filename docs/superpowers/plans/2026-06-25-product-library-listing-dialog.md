# 商品库上架确认弹窗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为商品库上架流程增加上架确认弹窗、后端预检查和价格预览能力，确保提交到 Ozon 前已选择店铺、定价策略并完成必要校验。

**Architecture:** 后端新增统一的商品库上架预检查服务，负责店铺/策略读取、价格计算、提交前检查以及真正上架前的二次校验；前端新增独立弹窗组件承载上架预览与提交，不污染商品添加/编辑抽屉。商品库原始价格保持不变，最终上架价格仅影响本次提交并回写本地上架上下文。

**Tech Stack:** Express、Prisma、MySQL、Vue 3、Element Plus、Axios

---

### Task 1: 扩展商品库上架数据结构

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] 增加上架上下文字段到 `ProductSupply`
- [ ] 保持字段轻量，避免引入新表

### Task 2: 先补商品库上架预检查的回归测试

**Files:**
- Modify: `backend/scripts/productSupplyListingValidation.test.ts`

- [ ] 为建议价计算、阻止项、警告项、多 SKU 校验补充失败用例
- [ ] 先运行脚本确认当前实现不满足预期

### Task 3: 实现后端统一预检查服务

**Files:**
- Modify: `backend/src/services/productSupplyListingService.ts`

- [ ] 新增店铺/定价策略选择校验
- [ ] 新增建议价计算与 breakdown 输出
- [ ] 新增结构化 checks/canSubmit/blockingCount/warningCount 输出
- [ ] 兼容当前单 SKU 商品库数据

### Task 4: 实现后端预览接口与上架提交流程扩展

**Files:**
- Modify: `backend/src/controllers/productSupplyController.ts`
- Modify: `backend/src/routes/productSupplyRoutes.ts`

- [ ] 新增 `POST /product-supply/:id/listing-preview`
- [ ] 扩展 `POST /product-supply/:id/list-to-ozon` 请求体
- [ ] 上架前强制复用同源预检查
- [ ] 将最终价格、店铺、策略与检查摘要回写商品库记录

### Task 5: 扩展前端 API 类型与请求方法

**Files:**
- Modify: `frontend/src/api/productSupplyAPI.ts`

- [ ] 新增 listing preview 相关类型
- [ ] 扩展 `listToOzon` 请求体
- [ ] 新增 `listingPreview` 请求

### Task 6: 实现前端上架确认弹窗

**Files:**
- Create: `frontend/src/views/warehouse/product-library/components/ProductListingDialog.vue`

- [ ] 实现店铺选择、策略选择、价格预览、检查结果展示
- [ ] 允许手动修改最终上架价格
- [ ] 有阻止项时禁用确认按钮
- [ ] 下拉长选项支持换行

### Task 7: 接入商品库列表与页面交互

**Files:**
- Modify: `frontend/src/views/warehouse/product-library/index.vue`
- Modify: `frontend/src/views/warehouse/product-library/components/ProductLibraryList.vue`

- [ ] 将“上架”从直接提交改为打开弹窗
- [ ] 提交成功后延续现有轮询逻辑
- [ ] 列表上的禁用和提示继续保留

### Task 8: 运行验证并修正联调问题

**Files:**
- Modify: `backend/scripts/productSupplyListingValidation.test.ts`（如验证后需补充）

- [ ] 运行后端商品库上架校验脚本
- [ ] 运行模板过滤与属性 URL 回归脚本
- [ ] 运行前端构建
- [ ] 若无新增问题，整理变更结果
