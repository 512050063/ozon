import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const authController = fs.readFileSync(path.join(root, 'backend/src/controllers/authController.ts'), 'utf8');
const authStore = fs.readFileSync(path.join(root, 'frontend/src/store/authStore.ts'), 'utf8');
const login = fs.readFileSync(path.join(root, 'frontend/src/views/pages/Login.vue'), 'utf8');
const accountInfo = fs.readFileSync(path.join(root, 'frontend/src/views/settings/account-info/Index.vue'), 'utf8');

assert.match(authController, /SMS_SEND_COOLDOWN_MS\s*=\s*60\s*\*\s*1000/, 'SMS send should have a 60 second backend cooldown');
assert.match(authController, /smsSendCooldowns\s*=\s*new Map/, 'SMS send should store backend cooldown state');
assert.match(authController, /remainingSeconds[\s\S]*SMS_COOLDOWN/, 'SMS send should return remaining cooldown seconds');
assert.match(authController, /markSmsCooldown/, 'SMS send should start cooldown only after successful provider send');

assert.doesNotMatch(authController, /该手机号已被绑定|该手机号已被其他用户绑定/, 'Binding should allow the same phone number on multiple accounts');
assert.match(authController, /smsScene === 'bind_phone'[\s\S]*currentUser\.phone === phone[\s\S]*该手机号已绑定当前账号/, 'Binding should only reject rebinding the current account to its existing phone');
assert.match(authController, /smsScene === 'unbind_phone'[\s\S]*currentUser\.phone[\s\S]*手机号与当前账号绑定手机号不一致/, 'Unbinding should require the phone to match the current bound phone before sending SMS');
assert.match(authController, /readOptionalAuthUserId[\s\S]*请先登录后再发送验证码/, 'Binding and unbinding SMS should require current login state');

assert.match(authStore, /sendVerificationCode[\s\S]*return response/, 'Store should return full send verification response so callers can read cooldown data');
assert.match(login, /cooldownSeconds|remainingSeconds/, 'Forgot password page should consume backend cooldown seconds');
assert.match(accountInfo, /cooldownSeconds|remainingSeconds/, 'Account phone page should consume backend cooldown seconds');

console.log('smsSendGuard.test passed');
