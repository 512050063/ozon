# Ozon Finance Report Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Ozon finance report module with local DB-backed manual sync, correct fee categorization, and Ozon-like totals/list display.

**Architecture:** Backend owns finance transaction normalization and local aggregation. Frontend consumes explicit summary rows from the backend instead of guessing fee categories from translated labels. Existing manual sync and local DB query flow stays intact.

**Tech Stack:** Express + TypeScript + Prisma + MySQL backend, Vue 3 + Element Plus frontend, ts-node assertion tests.

---

## File Map

- `backend/src/services/ozonFinanceService.ts`: normalize Ozon finance operations, persist categorized fee fields, compute local totals and expense rows.
- `backend/scripts/financeReportService.test.ts`: assertion tests for classification, totals, and grouped rows using real-shaped Ozon transaction data.
- `frontend/src/api/ozonFinanceAPI.ts`: add typed backend expense rows.
- `frontend/src/views/ozon/finance-report/Index.vue`: render backend expense rows and fix net total from backend totals.

## Tasks

### Task 1: Backend Normalization Tests

- [ ] Create `backend/scripts/financeReportService.test.ts`.
- [ ] Assert that sale operations contribute to sales, Ozon commission, and delivery services from `services[].price`.
- [ ] Assert that accelerated review operations map to advertising.
- [ ] Assert that agency fee operations map to partner services.
- [ ] Run `npx ts-node scripts/financeReportService.test.ts`; expect failure before implementation.

### Task 2: Backend Normalization Implementation

- [ ] Add exported helpers in `ozonFinanceService.ts`: `classifyFinanceOperation`, `summarizeFinanceOperations`, `buildFinanceExpenseRows`.
- [ ] Update DB upsert to persist derived `servicesAmount`, `compensationAmount`, `othersAmount`, and nested posting metadata.
- [ ] Update `computeTotalsFromLocal` to aggregate from raw rows using the new helpers so existing synced data is corrected without resync.
- [ ] Update `aggregateByType` to sum actual `amount`, not only `accrualsForSale`.
- [ ] Run backend finance test; expect pass.

### Task 3: API Shape And Frontend Rendering

- [ ] Return `expenseRows` from `GET /api/ozon/finance/:storeId/totals`.
- [ ] Type `FinanceExpenseRow` in `frontend/src/api/ozonFinanceAPI.ts`.
- [ ] Use backend `expenseRows` in the finance page, with a frontend fallback for older responses.
- [ ] Keep the existing manual sync, filters, and grouping behavior.

### Task 4: Verification

- [ ] Run `npx ts-node scripts/financeReportService.test.ts` from `backend`.
- [ ] Run `npm run build` from `backend`.
- [ ] Run `npm run build` from `frontend`.
- [ ] Report exact pass/fail output and any unrelated pre-existing failures.
