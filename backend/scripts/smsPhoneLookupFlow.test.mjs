import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const authController = fs.readFileSync(path.join(root, 'backend/src/controllers/authController.ts'), 'utf8');
const login = fs.readFileSync(path.join(root, 'frontend/src/views/pages/Login.vue'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'backend/prisma/schema.prisma'), 'utf8');

assert.match(schema, /phone\s+String\?/, 'User phone is optional and not declared unique');
assert.doesNotMatch(
  authController,
  /findUnique\(\{\s*where:\s*\{\s*phone\s*\}\s*as any/,
  'phone lookup should not use findUnique because phone is not unique in the Prisma schema'
);
assert.doesNotMatch(
  authController,
  /该手机号已被绑定|该手机号已被其他用户绑定/,
  'phone binding should not enforce one phone per account'
);
assert.match(
  authController,
  /smsScene === 'forgot_password'[\s\S]*username[\s\S]*phone[\s\S]*findFirst/,
  'forgot password SMS should verify username and phone before sending a code'
);
assert.match(
  authController,
  /用户名或手机号错误/,
  'forgot password should report username or phone errors before SMS code verification'
);
assert.doesNotMatch(
  authController,
  /手机号或验证码错误/,
  'forgot password username/phone mismatch should not mention verification code before checking it'
);
assert.match(
  login,
  /sendVerificationCode\(forgotForm\.value\.phone,\s*'forgot_password',\s*forgotForm\.value\.username\)/,
  'forgot password page should send SMS with forgot_password scene and username'
);
assert.match(
  login,
  /<button[\s\S]*type="button"[\s\S]*@click="sendForgotCode"/,
  'forgot password SMS button should not submit the reset form'
);
assert.match(
  login,
  /native-type="submit"[\s\S]*验证身份/,
  'forgot password verification should submit through the form submit handler'
);

console.log('smsPhoneLookupFlow.test passed');
