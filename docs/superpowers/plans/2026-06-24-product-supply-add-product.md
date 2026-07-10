# Product Supply Add Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Ozon-template-driven add-product drawer so adding can create one or many single-SKU product library records from real cached Ozon category/type attributes.

**Architecture:** Backend owns template normalization and SKU expansion. Frontend renders a single drawer that has a multi-SKU matrix only in create mode; persisted records remain one SKU per `ProductSupply` row. Existing list/edit/delete/list-to-Ozon flows continue to operate on individual rows.

**Tech Stack:** Vue 3 + Element Plus + TypeScript frontend, Express + Prisma + MySQL backend, Node/ts-node assertion tests.

---

## File Map

- `backend/prisma/schema.prisma`: add Ozon template cache and single-SKU product fields.
- `backend/src/services/productSupplyTemplateService.ts`: normalize Ozon attributes into sections, cache template, build SKU summaries and row payloads.
- `backend/scripts/productSupplyTemplateService.test.ts`: assertion tests for normalization and SKU expansion.
- `backend/src/services/ozonCategoryService.ts`: fix attribute value fetch to use real attribute id plus category/type context.
- `backend/src/controllers/productSupplyController.ts`: add template endpoint, support batch SKU create/update fields.
- `backend/src/routes/productSupplyRoutes.ts`: register template endpoint before `/:id`.
- `frontend/src/api/productSupplyAPI.ts`: add template API and new product fields/payload types.
- `frontend/src/types/selection.ts`: extend `AddProductForm` and define SKU/template form types.
- `frontend/src/views/warehouse/product-library/components/AttributeField.vue`: support errors, arrays/collections, select value ids, consistent hints.
- `frontend/src/views/warehouse/product-library/components/AddProductDrawer.vue`: render template-driven sections and create-mode SKU matrix.
- `frontend/src/views/warehouse/product-library/components/ProductLibraryList.vue`: show variant summary.
- `frontend/src/views/warehouse/product-library/index.vue`: pass batch create payload and preserve single-row edit.

## Tasks

### Task 1: Backend Pure Logic And Tests

- [ ] Write tests in `backend/scripts/productSupplyTemplateService.test.ts` for: attribute normalization, hidden/variant split, SKU row expansion, variant summary, and product name not being mutated.
- [ ] Run `npx ts-node scripts/productSupplyTemplateService.test.ts` from `backend`; expected failure because service does not exist.
- [ ] Create `backend/src/services/productSupplyTemplateService.ts` with pure helpers.
- [ ] Run the test again; expected pass.

### Task 2: Prisma Schema And Backend API

- [ ] Modify `backend/prisma/schema.prisma` to add `OzonProductTemplate` and extend `ProductSupply`.
- [ ] Modify `backend/src/services/ozonCategoryService.ts` so dictionary values are fetched with `attribute_id`, `description_category_id`, `type_id`, `limit`, `last_value_id`, not `dictionary_id` as `attribute_id`.
- [ ] Add `getProductSupplyTemplate` controller and route.
- [ ] Update create/update/get/list controllers to read/write new fields, support batch SKU creation in a transaction, and serialize BigInt/JSON safely.
- [ ] Run `npx prisma generate` and `npm run build` from `backend`.

### Task 3: Frontend API And Types

- [ ] Extend frontend API and shared types to represent templates, attributes, SKU rows, and new product fields.
- [ ] Run `npm run build` from `frontend`; expected type failures until drawer/list are updated.

### Task 4: Add Product Drawer

- [ ] Refactor `AddProductDrawer.vue` to call product supply template API after category/type selection.
- [ ] Keep existing floating-label style and extend validation state.
- [ ] In create mode, render SKU dimension controls and SKU matrix; submit `base + skus + templateSnapshot`.
- [ ] In edit mode, render only a single-row form and never show SKU matrix.

### Task 5: Product List Variant Summary

- [ ] Update `ProductLibraryList.vue` to show `variantSummary` under the product name when present.
- [ ] Update `index.vue` submit mapping for batch create and single edit.
- [ ] Run `npm run build` from `frontend`.

### Task 6: Final Verification

- [ ] Run backend logic test.
- [ ] Run backend build.
- [ ] Run frontend build.
- [ ] If dev server is useful, start it and provide URL.
