# Black-Box Smoke Matrix

## Auth
- `/auth`: login form renders; `admin/admin123` logs in; redirects away from `/auth`.

## Dashboard
- `/dashboard`: summary cards render; no blocking console errors.

## Ozon 优选
- `/product-analysis/ozon-preference`: empty state fills results area; search disabled when keyword/category are empty; manual add opens only when Cookie state passes.

## 竞价监控
- `/product-analysis/bidding-monitor`: strategy tabs render; empty states do not overlap.

## 货源采集
- `/source-collection/product-collection`: product supply list renders real DB data.
- `/source-collection/supply-management`: source split/list actions render.

## 本地仓库
- `/warehouse/product-library`: table renders; listing actions visible.
- `/warehouse/material-library`: images render or fallback state renders.

## Ozon 店铺
- `/ozon/store-management`: global current-store selector is available in header; no page-level store dropdown.
- `/ozon/product-management`: uses current operation store; no page-level store dropdown.
- `/ozon/order-management`: uses current operation store; no page-level store dropdown.
- `/ozon/finance-report`: uses current operation store; empty rows do not collapse.

## 智能客服
- `/customer-service/messages`: buyer/service tabs distinguish data; notification mock data is clearly mock.
- `/customer-service`: auto reply page renders.

## 系统设置
- `/settings/account-info`: profile form renders.
- `/settings/api-config`: cookie/API config panels render.
- `/settings/user-management`: user table renders.
- `/settings/role-management`: role table renders.
- `/settings/payment-records`: payment table renders.
