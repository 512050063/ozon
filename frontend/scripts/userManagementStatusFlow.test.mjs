import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync('src/views/settings/user-management/Index.vue', 'utf8');
const api = readFileSync('src/api/userManagementAPI.ts', 'utf8');
const request = readFileSync('src/api/request.ts', 'utf8');
const confirmDialog = readFileSync('src/components/ui/AppDeleteConfirmDialog.vue', 'utf8');
const controller = readFileSync('../backend/src/controllers/userManagementController.ts', 'utf8');
const routes = readFileSync('../backend/src/routes/userManagementRoutes.ts', 'utf8');
const authController = readFileSync('../backend/src/controllers/authController.ts', 'utf8');

assert.doesNotMatch(view, /class="status-segmented/, 'user add/edit dialog should not expose status editing');
assert.doesNotMatch(view, /statusOptions/, 'user add/edit dialog should not keep status segmented options');
assert.doesNotMatch(view, /status:\s*formData\.status/, 'user create/update payload should not submit status from form');
assert.match(view, /:disabled="isRoleSelectDisabled"[\s\S]*class="select-base dialog-select/, 'user role selection should use privilege-aware disabled state');
assert.match(view, /assignableRoles\s*=\s*computed\(\(\)\s*=>\s*roles\.value\.filter\(role\s*=>\s*role\.code !== 'super_admin'\)\)/, 'user role dropdown should not include super admin');
assert.match(view, /:options="assignableRoles\.map/, 'user role dropdown should use filtered assignable roles');
assert.doesNotMatch(view, /:options="roles\.map\(r => \(\{ label: r\.name, value: r\.id \}\)\)"/, 'user role dropdown must not use all roles directly');
assert.match(view, /class="user-status-tag/, 'user status should be rendered as a clickable tag');
assert.match(view, /openStatusConfirm\(row\)/, 'status tag should open a confirmation dialog');
assert.match(view, /AppDeleteConfirmDialog/, 'status change should reuse the same confirm dialog style as delete');
assert.match(view, /getNextUserStatus/, 'status toggle should calculate pending->active, active->inactive, inactive->active');
assert.match(api, /toggleUserStatus/, 'frontend API should expose a dedicated status toggle call');
assert.match(api, /\/users\/\$\{id\}\/status/, 'status toggle should call the dedicated backend route');
assert.match(request, /patch:\s*async/, 'request wrapper should expose patch for dedicated status route');
assert.match(confirmDialog, /variant\?:\s*'danger'\s*\|\s*'success'\s*\|\s*'warning'/, 'confirm dialog should support red green orange themes');
assert.match(confirmDialog, /icon\?:\s*'delete'\s*\|\s*'disable'\s*\|\s*'success'\s*\|\s*'warning'/, 'confirm dialog should support status-specific icons');
assert.match(view, /statusConfirmIcon/, 'status dialog should choose icon by current status');
assert.match(view, /getUserPrivilegeLevel/, 'frontend should use a unified role hierarchy for user operations');
assert.match(view, /isSelfUser/, 'frontend should keep self-operation guards separate from role hierarchy');
assert.match(view, /canCurrentUserManageRoles/, 'frontend should allow admin and super admin to change other users roles');
assert.match(view, /getRoleLevel\(formData\.targetRoleCode\) < 2/, 'frontend should disable role changes when admin edits another admin');
assert.match(view, /data\.roleId = formData\.roleId/, 'frontend should only submit roleId when role selection is allowed');
assert.match(confirmDialog, /app-delete-confirm-icon--success/, 'confirm dialog should render green status theme');
assert.match(confirmDialog, /app-delete-confirm-icon--warning/, 'confirm dialog should render orange status theme');
assert.match(confirmDialog, /app-delete-confirm-icon--danger/, 'confirm dialog should render red status theme');

assert.match(controller, /status:\s*'active'/, 'admin-created users should default to active');
assert.match(authController, /status:\s*'pending'/, 'frontend self-registration should default to pending');
assert.match(controller, /toggleUserStatus/, 'backend should expose a dedicated status toggle controller');
assert.match(controller, /不能禁用自己的账号/, 'backend should reject disabling the current account');
assert.match(controller, /低权限用户不能操作高权限用户/, 'backend should reject lower privilege status changes');
assert.match(controller, /只有管理员或超管可以修改用户角色/, 'backend should reject role changes from non-admin users');
assert.match(controller, /管理员不能修改其他管理员或超管的角色/, 'backend should reject admin role changes against admin or super admin users');
assert.match(controller, /不能修改自己的角色/, 'backend should reject super admin changing their own role');
assert.match(routes, /patch\('\/:id\/status'/, 'backend should register a dedicated status toggle route');

console.log('userManagementStatusFlow.test passed');
