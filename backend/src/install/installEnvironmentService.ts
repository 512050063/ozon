import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getImageUploadDir, normalizePublicBaseUrl } from '../services/publicAssetUrlService';

const execFileAsync = promisify(execFile);

export interface InstallCheck {
  key: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export const LINUX_CHROME_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

export function findChromeExecutable(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    ...LINUX_CHROME_CANDIDATES,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean) as string[];

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

export function ensureWritableDirs(rootDir: string): InstallCheck[] {
  const dirs = [
    'backend/data',
    'backend/data/uploads',
    'backend/data/uploads/images',
    'backend/scripts/data',
    'backend/scripts/data/cache',
    'logs',
  ];

  return dirs.map(relative => {
    const dir = path.join(rootDir, relative);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return {
        key: `writable:${relative}`,
        label: relative,
        status: 'pass' as const,
        message: '目录可写',
      };
    } catch (error: any) {
      return {
        key: `writable:${relative}`,
        label: relative,
        status: 'fail' as const,
        message: error.message,
      };
    }
  });
}

function requestHeadOrGet(url: string): Promise<{ statusCode: number; contentType: string }> {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith('https://') ? https : http;
    const req = transport.request(url, { method: 'GET', timeout: 15000 }, response => {
      response.resume();
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode || 0,
          contentType: String(response.headers['content-type'] || ''),
        });
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('公网图片访问超时'));
    });
    req.on('error', reject);
    req.end();
  });
}

async function checkPublicImageAccess(): Promise<InstallCheck> {
  const fileName = `install-public-image-check-${Date.now()}.png`;
  const uploadDir = getImageUploadDir();
  const imagePath = path.join(uploadDir, fileName);

  try {
    const publicBaseUrl = normalizePublicBaseUrl(process.env.PUBLIC_BASE_URL || '');
    const parsedBaseUrl = new URL(publicBaseUrl);
    if (parsedBaseUrl.protocol !== 'https:') {
      return {
        key: 'public-image-url',
        label: '公网图片访问',
        status: 'fail',
        message: 'PUBLIC_BASE_URL 必须使用 HTTPS，Ozon 上架图片需要公网 HTTPS 地址',
      };
    }

    fs.mkdirSync(uploadDir, { recursive: true });
    const onePixelPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    );
    fs.writeFileSync(imagePath, onePixelPng);

    const probeUrl = `${publicBaseUrl}/uploads/images/${fileName}`;
    const response = await requestHeadOrGet(probeUrl);
    if (response.statusCode !== 200) {
      return {
        key: 'public-image-url',
        label: '公网图片访问',
        status: 'fail',
        message: `${probeUrl} 返回 HTTP ${response.statusCode}`,
      };
    }
    if (!response.contentType.toLowerCase().startsWith('image/')) {
      return {
        key: 'public-image-url',
        label: '公网图片访问',
        status: 'fail',
        message: `${probeUrl} Content-Type 异常：${response.contentType || '-'}`,
      };
    }

    return {
      key: 'public-image-url',
      label: '公网图片访问',
      status: 'pass',
      message: `/uploads/images/ 可通过 PUBLIC_BASE_URL 访问`,
    };
  } catch (error: any) {
    return {
      key: 'public-image-url',
      label: '公网图片访问',
      status: 'fail',
      message: error.message || '公网图片访问检测失败',
    };
  } finally {
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch {
      // 安装检查不因清理探针文件失败而覆盖真实检测结果。
    }
  }
}

export async function runInstallEnvironmentChecks(rootDir = path.resolve(__dirname, '../../..')): Promise<InstallCheck[]> {
  const checks: InstallCheck[] = [];
  const nodeMajor = Number(process.versions.node.split('.')[0]);

  checks.push({
    key: 'node',
    label: 'Node.js',
    status: nodeMajor >= 20 ? 'pass' : 'fail',
    message: `当前版本 ${process.versions.node}`,
  });

  checks.push(...ensureWritableDirs(rootDir));

  const pythonCommand = process.env.PYTHON_PATH || 'python3';
  try {
    const { stdout } = await execFileAsync(pythonCommand, ['--version'], { timeout: 10000 });
    checks.push({
      key: 'python',
      label: 'Python',
      status: 'pass',
      message: stdout.trim() || 'Python 可用',
    });
  } catch (error: any) {
    checks.push({
      key: 'python',
      label: 'Python',
      status: 'fail',
      message: error.message,
    });
  }

  try {
    await execFileAsync(pythonCommand, ['-c', 'import playwright; print("playwright ok")'], { timeout: 10000 });
    checks.push({
      key: 'python-playwright',
      label: 'Python Playwright',
      status: 'pass',
      message: 'Playwright 可导入',
    });
  } catch (error: any) {
    checks.push({
      key: 'python-playwright',
      label: 'Python Playwright',
      status: 'warn',
      message: `Playwright 未就绪: ${error.message}`,
    });
  }

  const chrome = findChromeExecutable();
  checks.push({
    key: 'chrome',
    label: 'Chrome/Chromium',
    status: chrome ? 'pass' : 'warn',
    message: chrome || '未找到系统 Chrome/Chromium，将依赖 Playwright 浏览器或后续安装',
  });

  checks.push(await checkPublicImageAccess());

  return checks;
}
