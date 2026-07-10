# Product Name Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent, quota-aware product name translation for Ozon product management.

**Architecture:** Reuse the existing database-backed `translation_cache` table for durable translations, add a monthly usage table for character budget enforcement, expose a backend resolve endpoint that dedupes and translates only cache misses, and let the product management page call it after local products render. Initial list rendering stays non-blocking.

**Tech Stack:** Express, Prisma, MySQL, Vue 3, Element Plus, TypeScript, Vite.

---

### Task 1: Backend Translation Resolver

**Files:**
- Modify: `D:/project/ozon/backend/prisma/schema.prisma`
- Modify: `D:/project/ozon/backend/src/services/translationService.ts`
- Create: `D:/project/ozon/backend/src/controllers/translationController.ts`
- Create: `D:/project/ozon/backend/src/routes/translationRoutes.ts`
- Modify: `D:/project/ozon/backend/src/app.ts`
- Test: `D:/project/ozon/backend/scripts/productNameTranslationService.test.ts`

- [ ] Add `TranslationUsageMonthly` with unique `(userId, provider, month)`.
- [ ] Add resolver service APIs that dedupe names, prefer `translation_cache`, skip API when config is absent, and reject over-quota misses before external translation calls.
- [ ] Add `POST /api/translations/product-names/resolve`.
- [ ] Run `cd backend; npx ts-node --transpileOnly scripts/productNameTranslationService.test.ts`.

### Task 2: Frontend Product List Integration

**Files:**
- Modify: `D:/project/ozon/frontend/src/api/ozonProductAPI.ts`
- Modify: `D:/project/ozon/frontend/src/views/ozon/product-management/Index.vue`

- [ ] Add API method for product name translation resolution.
- [ ] After `loadLocalProducts()` succeeds, asynchronously submit current-page names with dedupe and session-level in-flight suppression.
- [ ] Merge returned translations into `products.value[*].nameZh`.
- [ ] Show one warning when translation API is missing or monthly quota is insufficient.

### Task 3: Verification

**Commands:**
- `cd D:/project/ozon/backend; npx prisma generate`
- `cd D:/project/ozon/backend; npm run build`
- `cd D:/project/ozon/frontend; npm run build`

**Browser:**
- Open `http://localhost:5173/ozon/product-management`.
- Confirm the list renders before translation completes.
- Confirm no new blocking console errors.
- Confirm translation resolve request is batched and deduped.
