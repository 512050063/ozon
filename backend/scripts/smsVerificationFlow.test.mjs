import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const authController = fs.readFileSync(path.join(root, 'backend/src/controllers/authController.ts'), 'utf8');
const authApi = fs.readFileSync(path.join(root, 'frontend/src/api/authAPI.ts'), 'utf8');
const authStore = fs.readFileSync(path.join(root, 'frontend/src/store/authStore.ts'), 'utf8');
const login = fs.readFileSync(path.join(root, 'frontend/src/views/pages/Login.vue'), 'utf8');
const accountInfo = fs.readFileSync(path.join(root, 'frontend/src/views/settings/account-info/Index.vue'), 'utf8');

assert.match(authController, /smsVerificationClient/, 'auth controller should use the real SMS verification client');
assert.match(authController, /verifyForgotPasswordCode/, 'auth controller should expose a forgot password identity verification step');
assert.match(authController, /forgot_password_reset/, 'forgot password reset should use a short-lived reset token');
assert.match(authController, /scene:\s*'forgot_password'/, 'forgot password should verify the forgot_password SMS scene');
assert.match(authController, /scene:\s*'bind_phone'/, 'phone bind should verify the bind_phone SMS scene');
assert.match(authController, /scene:\s*'unbind_phone'/, 'phone unbind should verify the unbind_phone SMS scene');
assert.match(authController, /username[\s\S]*phone[\s\S]*findFirst/, 'forgot password should match username and phone before resetting');
assert.doesNotMatch(authController, /模拟发送验证码|测试验证码|verificationCodes\.set/, 'real SMS flow should not send mock verification codes');

assert.match(authApi, /scene\?:/, 'frontend API should accept an SMS scene');
assert.match(authApi, /verifyForgotPasswordCode/, 'frontend API should expose forgot password identity verification');
assert.match(authStore, /sendVerificationCode\s*=\s*async\s*\(\s*phone:\s*string,\s*scene/, 'store should pass the SMS scene');
assert.match(authStore, /verifyForgotPasswordCode/, 'store should expose forgot password identity verification');
assert.match(login, /newPassword/, 'forgot password form should collect the new password');
assert.match(login, /forgotPasswordVerified/, 'forgot password page should split verification and reset steps');
assert.match(login, /验证身份/, 'forgot password page should verify identity before showing password fields');
assert.match(login, /sendVerificationCode\(forgotForm\.value\.phone,\s*'forgot_password'/, 'forgot page should request forgot_password codes');
assert.match(login, /forgotPasswordResetToken\.value,[\s\S]*ElMessage\.success\('密码重置成功，请使用新密码登录'\)[\s\S]*goBackToLogin\(\)/, 'forgot password reset success should use message feedback and return to login');
assert.doesNotMatch(login, /showSuccessModal|密码重置成功!/, 'forgot password reset success should not show a blocking success dialog');
assert.doesNotMatch(login, /测试验证码：111111/, 'forgot page should not show a mock code hint');
assert.match(accountInfo, /'unbind_phone'\s*:\s*'bind_phone'/, 'account page should choose bind or unbind SMS scene');
assert.match(accountInfo, /startPhoneCodeCountdown[\s\S]*unbindPhoneCodeCountdown/, 'unbind SMS countdown should use the shared backend-driven countdown');
assert.doesNotMatch(accountInfo, /测试验证码：111111/, 'account page should not show a mock code hint');

console.log('smsVerificationFlow.test passed');
