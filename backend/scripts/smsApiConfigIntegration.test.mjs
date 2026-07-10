import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');

const apiConfigPage = fs.readFileSync(path.join(root, 'frontend/src/views/settings/api-config/Index.vue'), 'utf8');
const smsService = fs.readFileSync(path.join(root, 'backend/src/services/smsVerificationService.ts'), 'utf8');
const apiConfigController = fs.readFileSync(path.join(root, 'backend/src/controllers/apiConfigController.ts'), 'utf8');
const smsConfigBlock = apiConfigPage.match(/'sms': \{[\s\S]*?\n  \},\n  'translation'/)?.[0] || '';

assert.match(smsConfigBlock, /key:\s*'endpoint'[\s\S]*label:\s*'API 地址'/, 'SMS config should expose API endpoint address');
assert.match(smsConfigBlock, /key:\s*'accessKeyId'[\s\S]*label:\s*'AccessKey ID'/, 'SMS config should expose AccessKey ID');
assert.match(smsConfigBlock, /key:\s*'accessKeySecret'[\s\S]*label:\s*'AccessKey Secret'/, 'SMS config should expose AccessKey Secret');
assert.match(smsConfigBlock, /号码认证服务中的短信认证配置/, 'SMS config should distinguish DYPNS SMS verification from ordinary SMS verification');
assert.match(smsConfigBlock, /key:\s*'signName'[\s\S]*label:\s*'短信认证签名'/, 'SMS config should expose the gifted SMS authentication sign name');
assert.doesNotMatch(smsConfigBlock, /key:\s*'templateCode'|赠送模板/, 'SMS config should not expose fixed gifted template codes');
assert.doesNotMatch(smsConfigBlock, /key:\s*'apiKey'|key:\s*'apiSecret'|key:\s*'sign'/, 'SMS config should not use old generic key/secret/sign fields');

assert.match(smsService, /loadSmsVerificationConfig/, 'SMS service should load config from persisted API config');
assert.match(smsService, /apiConfig\.findFirst[\s\S]*platform:\s*'sms'/, 'SMS service should read sms platform config from database');
assert.match(smsService, /forgot_password[\s\S]*100003/, 'Forgot password should use the gifted reset password template');
assert.match(smsService, /bind_phone[\s\S]*100004/, 'Phone binding should use the gifted bind new phone template');
assert.match(smsService, /unbind_phone[\s\S]*100002/, 'Phone unbinding should use the gifted modify bound phone template');
assert.match(smsService, /validateStatus:\s*\(\)\s*=>\s*true/, 'SMS RPC transport should pass Aliyun HTTP error bodies to business error parsing');
assert.match(apiConfigController, /platform === 'sms'/, 'API config test should handle SMS config explicitly');
assert.match(apiConfigController, /endpoint[\s\S]*accessKeyId[\s\S]*accessKeySecret[\s\S]*signName/, 'SMS config test should require Aliyun endpoint, access keys and sign');
assert.doesNotMatch(apiConfigController, /templateCode/, 'SMS config test should not require a template code');

console.log('smsApiConfigIntegration.test passed');
