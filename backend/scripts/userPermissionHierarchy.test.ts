import assert from 'node:assert/strict';
import { canOperateTargetUser } from '../src/controllers/userManagementController';

const superAdmin = { id: 1, username: 'admin', role: { code: 'super_admin' } };
const adminUser = { id: 2, username: 'manager', role: { code: 'admin' } };
const anotherAdmin = { id: 3, username: 'manager2', role: { code: 'admin' } };
const legacyAdminUsername = { id: 6, username: 'admin', role: { code: 'admin' } };
const sellerUser = { id: 4, username: 'seller', role: { code: 'seller' } };
const customerServiceUser = { id: 5, username: 'service', role: { code: 'customer_service' } };

assert.equal(canOperateTargetUser(superAdmin, adminUser).allowed, true, 'super admin should operate admin users');
assert.equal(canOperateTargetUser(superAdmin, sellerUser).allowed, true, 'super admin should operate ordinary users');
assert.equal(canOperateTargetUser(adminUser, sellerUser).allowed, true, 'admin users should operate lower privilege users');
assert.equal(canOperateTargetUser(adminUser, customerServiceUser).allowed, true, 'admin users should operate all ordinary roles');
assert.equal(canOperateTargetUser(adminUser, anotherAdmin).allowed, false, 'admin users should not operate same privilege admin users');
assert.equal(canOperateTargetUser(adminUser, superAdmin).allowed, false, 'admin users should not operate super admin');
assert.equal(canOperateTargetUser(legacyAdminUsername, adminUser).allowed, false, 'admin username alone should not grant super admin privilege');
assert.equal(canOperateTargetUser(sellerUser, customerServiceUser).allowed, false, 'ordinary users should not operate same-level ordinary users');
assert.equal(canOperateTargetUser(sellerUser, adminUser).allowed, false, 'ordinary users should not operate higher privilege users');

console.log('userPermissionHierarchy.test passed');
