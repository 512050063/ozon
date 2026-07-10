import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const authController = fs.readFileSync(path.join(root, 'backend/src/controllers/authController.ts'), 'utf8');
const authStore = fs.readFileSync(path.join(root, 'frontend/src/store/authStore.ts'), 'utf8');
const authApi = fs.readFileSync(path.join(root, 'frontend/src/api/authAPI.ts'), 'utf8');
const loginPage = fs.readFileSync(path.join(root, 'frontend/src/views/pages/Login.vue'), 'utf8');
const userApi = fs.readFileSync(path.join(root, 'frontend/src/api/userManagementAPI.ts'), 'utf8');
const userPage = fs.readFileSync(path.join(root, 'frontend/src/views/settings/user-management/Index.vue'), 'utf8');

assert.match(
  authController,
  /const\s+\{\s*username,\s*password\s*\}\s*=\s*req\.body/,
  'Registration should only require username and password'
);
assert.doesNotMatch(
  authController,
  /注册[\s\S]{0,160}手机号和验证码为必填项/,
  'Registration should not require phone or verification code'
);
assert.match(
  authController,
  /status:\s*'pending'/,
  'Self-registered users should be created as pending'
);
assert.match(
  authController,
  /账号待审核，请联系管理员/,
  'Pending users should be blocked from login with a clear message'
);
assert.match(
  authController,
  /注册申请已提交，等待管理员审核/,
  'Registration response should explain that admin approval is required'
);
assert.doesNotMatch(
  authController,
  /注册成功[\s\S]{0,260}token/,
  'Registration should not issue a login token'
);
assert.match(
  authApi,
  /register:\s*async\s*\(data:\s*\{\s*username:\s*string;\s*password:\s*string;\s*\}/,
  'Frontend auth API should keep registration payload to username/password'
);
assert.match(
  authStore,
  /const\s+register\s*=\s*async\s*\(username:\s*string,\s*password:\s*string\)/,
  'Auth store register should accept username/password only'
);
assert.doesNotMatch(
  authStore,
  /register[\s\S]{0,600}localStorage\.setItem\('token'/,
  'Register flow should not persist an auth token'
);
assert.match(
  loginPage,
  /注册申请已提交，等待管理员审核/,
  'Login page should show pending approval after registration'
);
assert.match(
  userApi,
  /status\?:\s*'pending'\s*\|\s*'active'\s*\|\s*'inactive'/,
  'User management API should support pending status'
);
assert.match(
  userPage,
  /待审核/,
  'User management page should display pending users'
);
assert.match(
  userPage,
  /审核通过/,
  'User management page should expose approval action'
);

console.log('userRegistrationApproval.test passed');
