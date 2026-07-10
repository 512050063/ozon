# Ozon Finance And Promotions Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize Ozon finance report and promotions page structure without changing visible behavior or styling.

**Architecture:** Keep route page files as orchestration shells. Move large visual regions into local `components/`, and move pure formatting/data helpers into local `utils/` or `composables/` only when doing so reduces duplication. Preserve existing APIs, CSS class names, events, and user-facing copy.

**Tech Stack:** Vue 3 SFC, TypeScript, Element Plus, existing `App*` UI components, Vite.

---

### Task 1: Split Finance Report Summary Section

**Files:**
- Create: `frontend/src/views/ozon/finance-report/components/FinanceSummarySection.vue`
- Modify: `frontend/src/views/ozon/finance-report/Index.vue`

- [ ] Move the finance totals/sales/expense summary template into `FinanceSummarySection.vue`.
- [ ] Pass existing values and formatter callbacks as props: `loadingTotals`, `totals`, `financeSummaryExpanded`, `netTotal`, `salesAndReturns`, `totalExpense`, `salesBarWidth`, `expenseBarWidth`, `expenseRowsFull`, `amountToneClass`, `signedAmt`, `fmtAmt`, `formatExpenseAmount`.
- [ ] Emit `toggle-summary` from the component instead of mutating parent state directly.
- [ ] Move only the CSS selectors used by the summary section into the new component, preserving values.
- [ ] Verify `Index.vue` still renders the same summary states: loading, data, empty.

### Task 2: Split Finance Report Toolbar

**Files:**
- Create: `frontend/src/views/ozon/finance-report/components/FinanceReportToolbar.vue`
- Modify: `frontend/src/views/ozon/finance-report/Index.vue`

- [ ] Move the date picker, type select, search button, sync button, and metadata display into `FinanceReportToolbar.vue`.
- [ ] Keep date-range state in `Index.vue` for now, passing all existing computed data and event handlers into the component.
- [ ] Emit search, sync-log-open, period toggle/navigation/select/apply events back to `Index.vue`.
- [ ] Move toolbar and period-picker CSS into the toolbar component, preserving class names and dimensions.
- [ ] Verify the toolbar still opens/closes the custom period picker and sync button stays unchanged.

### Task 3: Split Promotions Product Page

**Files:**
- Create: `frontend/src/views/ozon/promotions/components/PromotionProductsTable.vue`
- Create: `frontend/src/views/ozon/promotions/composables/usePromotionProductDisplay.ts`
- Modify: `frontend/src/views/ozon/promotions/PromotionProducts.vue`

- [ ] Move the large `AppTable` slots into `PromotionProductsTable.vue`.
- [ ] Move display-only functions for names, prices, stocks, limits, warnings, and product counts into `usePromotionProductDisplay.ts`.
- [ ] Keep loading, pagination, API calls, and row mutation in the route page.
- [ ] Preserve existing table columns, class names, and inline edit events.
- [ ] Verify active/planned tabs, pagination, add drawer, remove, and inline edit still work.

### Task 4: Split Promotion Add Products Drawer Table

**Files:**
- Create: `frontend/src/views/ozon/promotions/components/PromotionCandidateTable.vue`
- Modify: `frontend/src/views/ozon/promotions/components/PromotionAddProductsDrawer.vue`

- [ ] Move candidate product table markup into `PromotionCandidateTable.vue`.
- [ ] Keep candidate loading, pagination, API calls, and add action in the drawer.
- [ ] Share display helpers from `usePromotionProductDisplay.ts` where possible.
- [ ] Preserve current drawer dimensions, row heights, and pagination behavior.

### Task 5: Verification

**Files:**
- Modify only if failures reveal import/type issues.

- [ ] Run `npm --prefix frontend run build`.
- [ ] Open `http://localhost:5173/ozon/finance-report` and confirm summary, toolbar, table, sync log trigger, and fixed content height still render.
- [ ] Open `http://localhost:5173/ozon/promotions` and an activity product route to confirm list/table/add drawer still render.
- [ ] Check browser console for new blocking errors caused by the refactor.
