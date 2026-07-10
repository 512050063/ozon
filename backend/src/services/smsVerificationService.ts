import axios from 'axios';
import crypto from 'crypto';
import prisma from '../config/database';

export type SmsVerificationScene = 'forgot_password' | 'bind_phone' | 'unbind_phone' | 'register';

export interface SmsVerificationConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  endpoint?: string;
  codeExpireMinutes?: number;
}

export interface SendCodeInput {
  phone: string;
  scene: SmsVerificationScene;
}

export interface CheckCodeInput extends SendCodeInput {
  code: string;
}

type AliyunRpcTransport = (action: string, params: Record<string, string>, config: SmsVerificationConfig) => Promise<any>;

const ALIYUN_DYPNSAPI_VERSION = '2017-05-25';
const DEFAULT_ENDPOINT = 'https://dypnsapi.aliyuncs.com';
const DEFAULT_EXPIRE_MINUTES = 5;
const SCENE_TEMPLATE_CODES: Record<SmsVerificationScene, string> = {
  register: '100001',
  unbind_phone: '100002',
  forgot_password: '100003',
  bind_phone: '100004',
};

export class SmsVerificationError extends Error {
  constructor(
    public readonly code:
      | 'NOT_CONFIGURED'
      | 'INVALID_PHONE'
      | 'INVALID_CODE'
      | 'SEND_FAILED'
      | 'CHECK_FAILED',
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SmsVerificationError';
  }
}

export function normalizeSmsPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^1[3-9]\d{9}$/.test(digits)) {
    return digits;
  }
  if (/^861[3-9]\d{9}$/.test(digits)) {
    return digits.slice(2);
  }
  return '';
}

export function getSmsVerificationConfigFromEnv(): SmsVerificationConfig {
  return {
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || process.env.ALIYUN_SMS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '',
    signName: process.env.ALIYUN_SMS_SIGN_NAME || '',
    endpoint: process.env.ALIYUN_SMS_ENDPOINT || DEFAULT_ENDPOINT,
    codeExpireMinutes: Number(process.env.ALIYUN_SMS_CODE_EXPIRE_MINUTES || DEFAULT_EXPIRE_MINUTES),
  };
}

export async function loadSmsVerificationConfig(): Promise<SmsVerificationConfig> {
  const envConfig = getSmsVerificationConfigFromEnv();
  const persisted = await prisma.apiConfig.findFirst({
    where: {
      platform: 'sms',
      status: 'valid',
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
  const config = (persisted?.config || {}) as any;

  return {
    accessKeyId: String(config.accessKeyId || config.apiKey || envConfig.accessKeyId || ''),
    accessKeySecret: String(config.accessKeySecret || config.apiSecret || envConfig.accessKeySecret || ''),
    signName: String(config.signName || config.sign || envConfig.signName || ''),
    endpoint: String(config.endpoint || config.url || envConfig.endpoint || DEFAULT_ENDPOINT),
    codeExpireMinutes: Number(config.codeExpireMinutes || envConfig.codeExpireMinutes || DEFAULT_EXPIRE_MINUTES),
  };
}

export function buildAliyunSmsVerificationClient(
  config: SmsVerificationConfig = getSmsVerificationConfigFromEnv(),
  transport: AliyunRpcTransport = callAliyunRpc
) {
  const normalizedConfig = {
    ...config,
    endpoint: normalizeEndpoint(config.endpoint),
    codeExpireMinutes: Number.isFinite(config.codeExpireMinutes) && config.codeExpireMinutes
      ? config.codeExpireMinutes
      : DEFAULT_EXPIRE_MINUTES,
  };

  function assertConfigured() {
    if (
      !normalizedConfig.accessKeyId ||
      !normalizedConfig.accessKeySecret ||
      !normalizedConfig.endpoint ||
      !normalizedConfig.signName
    ) {
      throw new SmsVerificationError('NOT_CONFIGURED', '短信服务未配置，请联系管理员配置阿里云短信认证服务');
    }
  }

  function normalizePhoneOrThrow(phone: string) {
    const normalizedPhone = normalizeSmsPhone(phone);
    if (!normalizedPhone) {
      throw new SmsVerificationError('INVALID_PHONE', '手机号格式不正确');
    }
    return normalizedPhone;
  }

  async function sendCode(input: SendCodeInput) {
    assertConfigured();
    const normalizedPhone = normalizePhoneOrThrow(input.phone);
    const params: Record<string, string> = {
      CountryCode: '86',
      PhoneNumber: normalizedPhone,
      SignName: normalizedConfig.signName,
      TemplateCode: SCENE_TEMPLATE_CODES[input.scene],
      CodeLength: '6',
      CodeType: '1',
      ValidTime: String(Math.max(60, Math.min(3600, Math.round(normalizedConfig.codeExpireMinutes * 60)))),
      TemplateParam: JSON.stringify({
        code: '##code##',
        min: String(normalizedConfig.codeExpireMinutes),
      }),
    };
    const response = await transport('SendSmsVerifyCode', params, normalizedConfig);
    assertAliyunOk(response, 'SEND_FAILED', '验证码发送失败');
    return true;
  }

  async function checkCode(input: CheckCodeInput) {
    assertConfigured();
    const normalizedPhone = normalizePhoneOrThrow(input.phone);
    if (!/^\d{6}$/.test(String(input.code || ''))) {
      throw new SmsVerificationError('INVALID_CODE', '验证码格式不正确，必须是6位数字');
    }
    const response = await transport(
      'CheckSmsVerifyCode',
      {
        CountryCode: '86',
        PhoneNumber: normalizedPhone,
        VerifyCode: input.code,
      },
      normalizedConfig
    );
    assertAliyunOk(response, 'CHECK_FAILED', '验证码校验失败');
    assertVerifyCodePassed(response);
    return true;
  }

  return {
    sendCode,
    checkCode,
  };
}

export const smsVerificationClient = {
  async sendCode(input: SendCodeInput) {
    return buildAliyunSmsVerificationClient(await loadSmsVerificationConfig()).sendCode(input);
  },
  async checkCode(input: CheckCodeInput) {
    return buildAliyunSmsVerificationClient(await loadSmsVerificationConfig()).checkCode(input);
  },
};

async function callAliyunRpc(action: string, params: Record<string, string>, config: SmsVerificationConfig) {
  const signedParams = signRpcParams(action, params, config);
  const response = await axios.get(config.endpoint || DEFAULT_ENDPOINT, {
    params: signedParams,
    timeout: 15000,
    validateStatus: () => true,
  });
  return response.data;
}

function signRpcParams(action: string, params: Record<string, string>, config: SmsVerificationConfig) {
  const commonParams: Record<string, string> = {
    ...params,
    Action: action,
    Version: ALIYUN_DYPNSAPI_VERSION,
    Format: 'JSON',
    AccessKeyId: config.accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
    Timestamp: new Date().toISOString(),
  };
  const canonicalizedQueryString = Object.keys(commonParams)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(commonParams[key])}`)
    .join('&');
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalizedQueryString)}`;
  const signature = crypto
    .createHmac('sha1', `${config.accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');
  return {
    ...commonParams,
    Signature: signature,
  };
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

function normalizeEndpoint(endpoint?: string) {
  const value = (endpoint || DEFAULT_ENDPOINT).trim();
  if (!value) return DEFAULT_ENDPOINT;
  const endpointWithProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(endpointWithProtocol);
    if (url.hostname.toLowerCase() === 'dysmsapi.aliyuncs.com') {
      return DEFAULT_ENDPOINT;
    }
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch (error) {
    return DEFAULT_ENDPOINT;
  }
}

function assertAliyunOk(
  response: any,
  defaultCode: SmsVerificationError['code'],
  defaultMessage: string
) {
  const code = String(response?.Code || response?.code || '').toUpperCase();
  if (code === 'OK') return;

  const rawCode = String(response?.Code || response?.code || '');
  const rawMessage = String(response?.Message || response?.message || defaultMessage);
  const translatedMessage = translateAliyunMessage(rawCode, rawMessage) || rawMessage;
  if (/VERIFY.*CODE|CODE.*ERROR|INVALID/i.test(rawCode) || /验证码|校验码/.test(rawMessage)) {
    throw new SmsVerificationError('INVALID_CODE', translatedMessage || '验证码错误', response);
  }
  throw new SmsVerificationError(defaultCode, translatedMessage || defaultMessage, response);
}

function assertVerifyCodePassed(response: any) {
  const verifyResult = String(
    response?.Model?.VerifyResult ||
    response?.model?.verifyResult ||
    response?.VerifyResult ||
    response?.verifyResult ||
    ''
  ).toUpperCase();

  if (verifyResult === 'PASS') return;

  const rawMessage = String(response?.Message || response?.message || '');
  const detail = verifyResult ? `（${verifyResult}）` : '';
  throw new SmsVerificationError(
    'INVALID_CODE',
    rawMessage || `验证码错误或已过期${detail}`,
    response
  );
}

function translateAliyunMessage(rawCode: string, rawMessage: string) {
  if (
    /NO.?PERMISSION|ACCESS.?DENIED|FORBIDDEN/i.test(rawCode) ||
    /not authorized|access denied|forbidden/i.test(rawMessage)
  ) {
    return '阿里云 AccessKey 无权调用短信认证服务，请在 RAM 中授予 dypns:SendSmsVerifyCode、dypns:CheckSmsVerifyCode 权限，或使用已授权号码认证服务的 AccessKey';
  }
  return '';
}
