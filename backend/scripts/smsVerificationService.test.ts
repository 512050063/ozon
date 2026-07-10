import assert from 'assert';
import {
  SmsVerificationConfig,
  SmsVerificationError,
  buildAliyunSmsVerificationClient,
  normalizeSmsPhone,
} from '../src/services/smsVerificationService';

async function run() {
  assert.equal(normalizeSmsPhone('13800138000'), '13800138000');
  assert.equal(normalizeSmsPhone('+8613800138000'), '13800138000');
  assert.equal(normalizeSmsPhone('86 13800138000'), '13800138000');
  assert.equal(normalizeSmsPhone('001'), '');

  const missingConfigClient = buildAliyunSmsVerificationClient({
    accessKeyId: '',
    accessKeySecret: '',
    signName: '',
  });

  await assert.rejects(
    () => missingConfigClient.sendCode({ phone: '13800138000', scene: 'forgot_password' }),
    (error: unknown) => error instanceof SmsVerificationError && error.code === 'NOT_CONFIGURED'
  );

  const requests: Array<{ action: string; params: Record<string, string>; endpoint?: string }> = [];
  const config: SmsVerificationConfig = {
    accessKeyId: 'access-key-id',
    accessKeySecret: 'access-key-secret',
    signName: '测试签名',
    endpoint: 'https://dypnsapi.aliyuncs.com',
    codeExpireMinutes: 5,
  };
  const client = buildAliyunSmsVerificationClient(config, async (action, params, requestConfig) => {
    requests.push({ action, params, endpoint: requestConfig.endpoint });
    if (action === 'SendSmsVerifyCode') {
      return { Code: 'OK', Message: 'OK' };
    }
    if (params.VerifyCode === '123456') {
      return { Code: 'OK', Message: 'OK', Model: { VerifyResult: 'PASS' } };
    }
    return { Code: 'OK', Message: 'OK', Model: { VerifyResult: 'UNKNOWN' } };
  });

  await client.sendCode({ phone: '13800138000', scene: 'bind_phone' });
  assert.equal(requests[0].action, 'SendSmsVerifyCode');
  assert.equal(requests[0].params.CountryCode, '86');
  assert.equal(requests[0].params.PhoneNumber, '13800138000');
  assert.equal(requests[0].params.TemplateCode, '100004');
  assert.equal(requests[0].params.SignName, '测试签名');
  assert.equal(requests[0].params.CodeLength, '6');
  assert.equal(requests[0].params.CodeType, '1');
  assert.equal(requests[0].params.ValidTime, '300');
  assert.deepEqual(JSON.parse(requests[0].params.TemplateParam), { code: '##code##', min: '5' });

  await client.sendCode({ phone: '13800138000', scene: 'forgot_password' });
  assert.equal(requests[1].params.TemplateCode, '100003');

  await client.sendCode({ phone: '13800138000', scene: 'unbind_phone' });
  assert.equal(requests[2].params.TemplateCode, '100002');

  const ok = await client.checkCode({ phone: '+8613800138000', code: '123456', scene: 'bind_phone' });
  assert.equal(ok, true);
  assert.equal(requests[3].action, 'CheckSmsVerifyCode');
  assert.equal(requests[3].params.CountryCode, '86');
  assert.equal(requests[3].params.PhoneNumber, '13800138000');
  assert.equal(requests[3].params.VerifyCode, '123456');

  await assert.rejects(
    () => client.checkCode({ phone: '13800138000', code: '999999', scene: 'bind_phone' }),
    (error: unknown) => error instanceof SmsVerificationError && error.code === 'INVALID_CODE'
  );

  const legacyEndpointRequests: Array<{ endpoint?: string }> = [];
  const legacyEndpointClient = buildAliyunSmsVerificationClient(
    {
      ...config,
      endpoint: 'dysmsapi.aliyuncs.com',
    },
    async (_action, _params, requestConfig) => {
      legacyEndpointRequests.push({ endpoint: requestConfig.endpoint });
      return { Code: 'OK', Message: 'OK' };
    }
  );

  await legacyEndpointClient.sendCode({ phone: '13800138000', scene: 'unbind_phone' });
  assert.equal(
    legacyEndpointRequests[0].endpoint,
    'https://dypnsapi.aliyuncs.com',
    'SMS verification should normalize ordinary SMS endpoint to DYPNSAPI endpoint'
  );

  const unauthorizedClient = buildAliyunSmsVerificationClient(config, async () => ({
    Code: 'Forbidden.NoPermission',
    Message: 'You are not authorized to perform this action.',
  }));
  await assert.rejects(
    () => unauthorizedClient.sendCode({ phone: '13800138000', scene: 'bind_phone' }),
    (error: unknown) =>
      error instanceof SmsVerificationError &&
      error.code === 'SEND_FAILED' &&
      error.message.includes('阿里云 AccessKey 无权调用短信认证服务')
  );

  console.log('smsVerificationService.test passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
