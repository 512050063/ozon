import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')

const servicePath = path.join(root, 'backend/src/services/supplySourceService.ts')
const productSupplyControllerPath = path.join(root, 'backend/src/controllers/productSupplyController.ts')

assert.ok(fs.existsSync(servicePath), 'supplySourceService.ts should exist')

const service = fs.readFileSync(servicePath, 'utf8')
const controller = fs.readFileSync(productSupplyControllerPath, 'utf8')

assert.match(service, /export function buildSupplySourceData/, 'service should export buildSupplySourceData')
assert.match(service, /export async function upsertSupplySource/, 'service should export upsertSupplySource')
assert.match(service, /export async function listSupplySources/, 'service should export listSupplySources')
assert.match(service, /export async function previewSupplySourceFromUrl/, 'service should export previewSupplySourceFromUrl')
assert.match(service, /export async function importSupplySourceFromUrl/, 'service should export importSupplySourceFromUrl')
assert.match(service, /export async function updateSupplySource/, 'service should export updateSupplySource')
assert.match(service, /export async function deleteSupplySource/, 'service should export deleteSupplySource')
assert.match(service, /userId,\s*alibabaOfferId|alibabaOfferId,\s*userId/, 'service should preserve offerId-based reuse semantics')
assert.match(service, /resolveProductSupplySourceFromUrl/, 'service should reuse existing 1688 URL resolver')
assert.match(service, /findFirst[\s\S]*userId[\s\S]*alibabaOfferId/, 'upsert should find existing source by userId and alibabaOfferId')
assert.match(service, /boundProductCount/, 'list service should expose bound product count')
assert.match(service, /hasBoundProducts/, 'list service should expose bound product status')
assert.match(service, /_count:\s*\{\s*select:\s*\{\s*productSupplies:\s*true\s*\}/, 'list service should count product bindings')
assert.match(service, /throw new Error\('货源已绑定商品，不能删除'\)/, 'delete service should reject bound supply sources')
assert.doesNotMatch(service, /productSupply\.updateMany[\s\S]*supplySourceId:\s*null/, 'delete service should not auto-unbind products before deleting a supply source')

assert.match(controller, /from '..\/services\/supplySourceService'/, 'productSupplyController should import shared supply source service')
assert.doesNotMatch(controller, /function buildSupplySourceData/, 'productSupplyController should not keep local buildSupplySourceData')
assert.doesNotMatch(controller, /async function findReusableSupplySource/, 'productSupplyController should not keep local findReusableSupplySource')
assert.doesNotMatch(controller, /async function upsertSupplySourceForBinding/, 'productSupplyController should not keep local upsert helper')

const supplyControllerPath = path.join(root, 'backend/src/controllers/supplySourceController.ts')
const supplyRoutesPath = path.join(root, 'backend/src/routes/supplySourceRoutes.ts')
const appPath = path.join(root, 'backend/src/app.ts')

assert.ok(fs.existsSync(supplyControllerPath), 'supplySourceController.ts should exist')
assert.ok(fs.existsSync(supplyRoutesPath), 'supplySourceRoutes.ts should exist')

const supplyController = fs.readFileSync(supplyControllerPath, 'utf8')
const supplyRoutes = fs.readFileSync(supplyRoutesPath, 'utf8')
const app = fs.readFileSync(appPath, 'utf8')

assert.match(supplyController, /export const getSupplySourceItems/, 'controller should expose list action')
assert.match(supplyController, /export const previewSupplySourceUrl/, 'controller should expose URL preview action')
assert.match(supplyController, /export const importSupplySourceUrl/, 'controller should expose URL import action')
assert.match(supplyController, /export const updateSupplySourceItem/, 'controller should expose update action')
assert.match(supplyController, /export const deleteSupplySourceItem/, 'controller should expose delete action')
assert.match(supplyController, /listSupplySources/, 'controller should use shared list service')
assert.match(supplyController, /previewSupplySourceFromUrl/, 'controller should use shared preview service')
assert.match(supplyController, /importSupplySourceFromUrl/, 'controller should use shared import service')
assert.match(supplyController, /updateSupplySource/, 'controller should use shared update service')
assert.match(supplyController, /deleteSupplySource/, 'controller should use shared delete service')
assert.match(supplyController, /货源已绑定商品，不能删除/, 'controller should return conflict for bound source deletion')

assert.match(supplyRoutes, /router\.get\('\/'/, 'routes should list supply sources')
assert.match(supplyRoutes, /router\.post\('\/preview-url'/, 'routes should preview URL')
assert.match(supplyRoutes, /router\.post\('\/from-url'/, 'routes should import URL')
assert.match(supplyRoutes, /router\.put\('\/:id'/, 'routes should update source')
assert.match(supplyRoutes, /router\.delete\('\/:id'/, 'routes should delete source')
assert.match(app, /supplySourceRoutes/, 'app should import supply source routes')
assert.match(app, /app\.use\('\/api\/supply-sources', supplySourceRoutes\)/, 'app should mount /api/supply-sources')

console.log('supplySourceApiContracts tests passed')
