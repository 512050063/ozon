import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const listPath = path.join(
  root,
  'frontend/src/views/warehouse/product-library/components/ProductLibraryList.vue',
)
const indexPath = path.join(root, 'frontend/src/views/warehouse/product-library/index.vue')
const apiPath = path.join(root, 'frontend/src/api/productSupplyAPI.ts')
const controllerPath = path.join(root, 'backend/src/controllers/productSupplyController.ts')
const routesPath = path.join(root, 'backend/src/routes/productSupplyRoutes.ts')
const resolverPath = path.join(root, 'backend/src/services/productSupplySourceResolver.ts')
const supplySourceServicePath = path.join(root, 'backend/src/services/supplySourceService.ts')

const list = fs.readFileSync(listPath, 'utf8')
const index = fs.readFileSync(indexPath, 'utf8')
const api = fs.readFileSync(apiPath, 'utf8')
const controller = fs.readFileSync(controllerPath, 'utf8')
const routes = fs.readFileSync(routesPath, 'utf8')
const resolver = fs.existsSync(resolverPath) ? fs.readFileSync(resolverPath, 'utf8') : ''
const supplySourceService = fs.existsSync(supplySourceServicePath) ? fs.readFileSync(supplySourceServicePath, 'utf8') : ''

const sourceSlot = list.match(/<template #cell-source[\s\S]*?<template #cell-status/)?.[0] || ''
assert.ok(sourceSlot, 'source column slot should exist')
assert.match(sourceSlot, /无货源/, 'empty source state should show 无货源 tag')
assert.match(sourceSlot, /1688货源/, 'bound source state should show 1688货源 tag')
assert.ok(!/source-subtitle/.test(sourceSlot), 'source column should not show price as the primary cell UI')
assert.match(sourceSlot, /v-if="row\.supplySource"[\s\S]*app-table-tag--blue[\s\S]*handleEditSource\(row\)/, 'bound source tag should open the same binding dialog')

assert.match(index, /source-section-title/, 'source dialog should split content into titled modules')
assert.match(index, /当前绑定/, 'source dialog should keep current binding as a standalone module')
assert.doesNotMatch(index, /绑定方式/, 'source dialog should use a divider instead of binding method title text')
assert.match(index, /source-method-divider/, 'source dialog should separate binding methods with a divider')
assert.match(index, /source-dialog-fixed-body/, 'source dialog should reserve a fixed content height')
assert.match(index, /sourceExistingList[\s\S]*selectExistingSource/, 'source dialog should support selecting existing 1688 sources')
assert.doesNotMatch(index, /FolderOpened/, 'source tabs should not use a folder icon for existing sources')
assert.match(index, /Search/, 'source dialog should include a search icon for saved sources')
assert.match(index, /Link/, 'source dialog should use the link icon for binding context')
assert.match(index, /source-action-button/, 'source search button should use a colored compact action style')
assert.match(index, /source-card-check/, 'selected source should be shown with a check icon on the source card')
assert.match(index, /width:\s*16px[\s\S]*height:\s*16px/, 'selected source check icon should stay compact')
assert.doesNotMatch(index, /source-pending-note/, 'source dialog should not show a separate selected-source note module')
assert.match(index, /openSourceDetailUrl/, 'current bound source card should open the 1688 detail URL')
assert.match(index, /getAlibabaSourceDetailUrl/, 'source dialog should build a valid 1688 detail URL from detailUrl or offerId')
assert.match(index, /sourceExistingKeyword/, 'source dialog should have existing-source search state')
assert.doesNotMatch(index, /sourceUrlInput/, 'source dialog should not expose URL import state in the saved-source binding flow')
assert.doesNotMatch(index, /handleSourceUrlImport/, 'source dialog should not expose URL import action in the saved-source binding flow')
assert.doesNotMatch(index, /previewProductSupplySourceFromUrl/, 'source dialog should not call URL preview API from the saved-source binding flow')
assert.doesNotMatch(index, /alibabaAPI/, 'product library source URL parsing should not call the source-collection Alibaba API client')
assert.doesNotMatch(index, /getProductDetail/, 'product library source URL parsing should not call generic Alibaba product detail endpoint')
assert.match(index, /pendingSourceAction/, 'source dialog should submit only after footer confirm')
assert.match(index, /handleSourceConfirm/, 'source dialog footer confirm should apply the pending change')
assert.match(index, /source-unbind-small/, 'unbind action should be a small button beside the module title')
assert.match(index, /class="btn-confirm"/, 'source dialog should use global confirm button styling')
assert.match(index, /class="btn-cancel"/, 'source dialog should use global cancel button styling')
assert.doesNotMatch(index, /dialog-btn-confirm/, 'source dialog should not keep local confirm button styling')
assert.doesNotMatch(index, /dialog-btn-cancel/, 'source dialog should not keep local cancel button styling')

assert.match(api, /getSupplySources/, 'frontend API should expose saved source search')
assert.match(api, /previewProductSupplySourceFromUrl/, 'frontend API should expose product library source URL preview')
assert.match(api, /importProductSupplySourceFromUrl/, 'frontend API should expose source import by URL')
assert.match(routes, /\/sources/, 'backend routes should expose saved source search before /:id')
assert.match(routes, /\/source\/preview-url/, 'backend routes should expose product library source URL preview before /:id')
assert.match(routes, /\/:id\/source\/from-url/, 'backend routes should expose source import by URL')

assert.match(controller, /getSupplySources/, 'backend controller should list saved 1688 sources')
assert.match(controller, /previewProductSupplySourceFromUrl/, 'backend controller should preview 1688 source from URL without binding')
assert.match(controller, /importProductSupplySourceFromUrl/, 'backend controller should import and bind from URL')
assert.match(controller, /upsertSupplySource/, 'binding sources should use shared supply source upsert service')
assert.match(supplySourceService, /findReusableSupplySource/, 'binding sources should find an existing source by 1688 offer id')
assert.match(supplySourceService, /upsertSupplySource/, 'binding sources should update or create by 1688 offer id instead of duplicating')
assert.match(supplySourceService, /findFirst[\s\S]*userId[\s\S]*alibabaOfferId/, 'supply source reuse should be scoped by user and offer id')
assert.doesNotMatch(controller, /cloneSupplySourceForBinding/, 'binding existing sources should not clone duplicate source records')
assert.match(resolver, /resolveProductSupplySourceFromUrl/, 'product library URL parsing should live in its own resolver service')
assert.doesNotMatch(resolver, /searchSimilarProductsByImage|searchRecommendSameProducts/, 'product library URL resolver should not use source-collection same/similar search code')
assert.match(resolver, /call1688ApiGet/, 'product library URL resolver should use its own low-level GET enrichment call')
assert.match(resolver, /product\.keywords\.search/, 'product library URL resolver should enrich URL previews through a product-library-specific keyword lookup')
assert.match(resolver, /offerIdMatches/, 'product library URL resolver should only merge keyword lookup data when the offerId matches exactly')

const unbindBody = controller.match(/export const unbindProductSupplySource[\s\S]*?export const deleteProductSupplyItem/)?.[0] || ''
assert.ok(unbindBody, 'unbind controller should exist')
assert.ok(!/supplySource\.delete/.test(unbindBody), 'unbind should not delete reusable SupplySource records')

console.log('productLibrarySourceBinding tests passed')
