import * as crypto from 'crypto';

/**
 * AES-256-CBC 加解密工具
 * 密钥从环境变量 CRYPTO_KEY 读取，32字节(64位hex)
 * 如未设置则使用默认密钥（仅开发环境）
 */

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const envKey = process.env.CRYPTO_KEY;
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  // 开发环境回退：用固定密钥，生产环境必须设置 CRYPTO_KEY
  const fallback = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRYPTO_KEY 环境变量未设置，生产环境必须配置');
  }
  return Buffer.from(fallback, 'hex');
}

/**
 * 加密明文
 * 返回格式: iv:ciphertext (均为hex)
 */
export function encrypt(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * 解密密文
 * 输入格式: iv:ciphertext (均为hex)
 */
export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('无效的加密格式');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
