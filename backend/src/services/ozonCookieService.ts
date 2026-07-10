import logger from '../config/logger';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { updateCookieStatus } from './ozonPreferenceService';

interface CookieResult {
  success: boolean;
  data: any;
  message: string;
}

export interface OzonCookieValidationResult {
  valid: boolean;
  message: string;
}

// Cookie文件存储路径
const COOKIE_DIR = path.join(__dirname, '../../scripts/data');
const COOKIE_FILE = path.join(COOKIE_DIR, 'ozon_cookies.json');

// 确保目录存在
if (!fs.existsSync(COOKIE_DIR)) {
  fs.mkdirSync(COOKIE_DIR, { recursive: true });
}

function extractCookieScriptJson(output: string): any | null {
  const lines = String(output || '').trim().split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith('{') || !line.endsWith('}')) continue;
    try {
      return JSON.parse(line);
    } catch {
      continue;
    }
  }
  return null;
}

function summarizeCookieScriptFailure(stdout: string, stderr: string, fallback: string): string {
  const parsed = extractCookieScriptJson(`${stdout}\n${stderr}`);
  if (parsed?.message) {
    return String(parsed.message);
  }
  if (parsed?.reason) {
    return String(parsed.reason);
  }

  const combined = `${stderr || ''}\n${stdout || ''}`
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const meaningful = combined
    .filter(line => !line.startsWith('Traceback') && !line.startsWith('File "') && !line.startsWith('~'));
  const tail = (meaningful.length ? meaningful : combined).slice(-4).join('；');
  return tail || fallback || 'Cookie脚本执行失败';
}

// 一键获取Cookie - 调用Python脚本
export async function fetchOzonCookie(): Promise<CookieResult> {
  return new Promise((resolve) => {
    // 优先使用项目内的脚本（带遮罩层和自动关闭功能）
    const scriptPath = path.join(__dirname, '../../scripts/ozon/ozon_cookie.py');
    
    if (fs.existsSync(scriptPath)) {
      logger.info(`使用项目内脚本: ${scriptPath}`);
      runCookieScript(scriptPath, resolve);
      return;
    }
    
    logger.warn(`Python脚本不存在`);
    resolve({
      success: false,
      data: null,
      message: '未找到ozon_cookie.py脚本'
    });
  });
}

// 运行Cookie脚本
function runCookieScript(scriptPath: string, resolve: (result: CookieResult) => void) {
  const scriptDir = path.dirname(scriptPath);
  const pythonPath = process.env.PYTHON_PATH || 'python';
  const command = `"${pythonPath}" "${scriptPath}"`;
  
  logger.info(`正在执行Cookie脚本: ${command}, cwd: ${scriptDir}`);
  
  exec(command, { timeout: 300000, cwd: scriptDir, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Cookie脚本执行失败: ${error.message}`);
      logger.error(`stdout: ${stdout}`);
      logger.error(`stderr: ${stderr}`);
      
      // 检查是否已生成文件（脚本可能超时但已完成）
      if (fs.existsSync(COOKIE_FILE)) {
        try {
          const stat = fs.statSync(COOKIE_FILE);
          const ageMs = Date.now() - stat.mtimeMs;
          if (ageMs < 60000) { // 1分钟内生成的文件
            const cookieData = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
            resolve({
              success: true,
              data: cookieData,
              message: 'Cookie获取成功（脚本超时但文件已生成）'
            });
            return;
          }
        } catch (e) {
          // ignore
        }
      }
      
      const message = summarizeCookieScriptFailure(stdout, stderr, error.message);
      resolve({
        success: false,
        data: null,
        message: `脚本执行失败: ${message}`
      });
      return;
    }
    
    if (stderr) {
      logger.warn(`Cookie脚本警告: ${stderr}`);
    }
    
    try {
      // Python 脚本最后一行是 JSON，前面是日志
      // 找到最后一个换行符后的 JSON
      const result = extractCookieScriptJson(stdout);
      if (!result) {
        throw new Error('未找到JSON输出');
      }
      
      logger.info(`Cookie脚本输出: ${JSON.stringify(result)}`);
      
      if (result.success) {
        // stdout 现在输出完整 Cookie 数据（含 cookies/local_storage/exported_at 等）
        // 用它写入文件，确保文件内容完整
        saveCookieToFile(result);
        
        // 更新配置文件中的 Cookie 状态
        updateCookieStatus(result.exported_at, result.lang, result.currency).catch(err => {
          logger.warn(`更新 Cookie 状态失败: ${err.message}`);
        });

        resolve({
          success: true,
          data: result,
          message: 'Cookie获取成功'
        });
      } else {
        resolve({
          success: false,
          data: null,
          message: result.message || result.reason || 'Cookie获取失败'
        });
      }
    } catch (parseError: any) {
      logger.error(`Cookie脚本输出解析失败: ${parseError.message}`);
      logger.error(`脚本输出: ${stdout}`);
      
      // 检查是否生成了文件（脚本可能在最后才输出JSON）
      if (fs.existsSync(COOKIE_FILE)) {
        try {
          const cookieData = fs.readFileSync(COOKIE_FILE, 'utf-8');
          const data = JSON.parse(cookieData);
          resolve({
            success: true,
            data: data,
            message: 'Cookie获取成功（从文件读取）'
          });
          return;
        } catch (e) {
          // 文件解析失败，继续
        }
      }
      
      resolve({
        success: false,
        data: null,
        message: `脚本输出解析失败: ${parseError.message}`
      });
    }
  });
}

// 手动导入Cookie - 处理上传的文件
export async function importOzonCookie(req: any): Promise<CookieResult> {
  return new Promise((resolve) => {
    const uploadedFile = req.file;

    // 检查是否有文件上传
    if (!uploadedFile) {
      resolve({
        success: false,
        data: null,
        message: '请选择要上传的文件'
      });
      return;
    }

    // 验证文件类型
    const originalName = uploadedFile.originalname || '';
    const mimeType = uploadedFile.mimetype || '';
    if (mimeType !== 'application/json' && !originalName.endsWith('.json')) {
      resolve({
        success: false,
        data: null,
        message: '请上传JSON格式的文件'
      });
      return;
    }
    
    try {
      // 读取文件内容
      const content = Buffer.isBuffer(uploadedFile.buffer)
        ? uploadedFile.buffer.toString('utf-8')
        : '';
      const cookieData = JSON.parse(content);
      
      // 保存到文件 + 更新状态
      saveCookieToFile(cookieData);
      updateCookieStatus(cookieData.exported_at, cookieData.lang, cookieData.currency).catch(() => {});
      
      logger.info('Cookie文件导入成功');
      
      resolve({
        success: true,
        data: cookieData,
        message: 'Cookie导入成功'
      });
    } catch (error: any) {
      logger.error(`Cookie导入失败: ${error.message}`);
      resolve({
        success: false,
        data: null,
        message: `文件解析失败: ${error.message}`
      });
    }
  });
}

// 获取当前Cookie信息
export async function getOzonCookie(): Promise<CookieResult> {
  try {
    if (!fs.existsSync(COOKIE_FILE)) {
      return {
        success: false,
        data: null,
        message: 'Cookie文件不存在'
      };
    }
    
    const content = fs.readFileSync(COOKIE_FILE, 'utf-8');
    const cookieData = JSON.parse(content);
    
    // 文件本身已包含 exported_at/lang/currency 等字段（由 ozon_cookie.py 写入）
    // 无需再从外部合并
    
    return {
      success: true,
      data: cookieData,
      message: '获取成功'
    };
  } catch (error: any) {
    logger.error(`读取Cookie文件失败: ${error.message}`);
    return {
      success: false,
      data: null,
      message: `读取Cookie失败: ${error.message}`
    };
  }
}

// 保存Cookie到文件
function saveCookieToFile(data: any) {
  try {
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    logger.info('Cookie已保存到文件');
  } catch (error: any) {
    logger.error(`保存Cookie失败: ${error.message}`);
  }
}

export function validateOzonCookieDataAvailability(cookieData: any): OzonCookieValidationResult {
  const cookies = Array.isArray(cookieData?.cookies) ? cookieData.cookies : [];
  const localStorage = cookieData?.local_storage || {};

  if (cookies.length === 0) {
    return { valid: false, message: 'Cookie文件中没有可用Cookie' };
  }

  const ozonCookieCount = cookies.filter((cookie: any) => {
    const domain = String(cookie?.domain || '').toLowerCase();
    return domain.includes('ozon');
  }).length;

  if (ozonCookieCount === 0) {
    return { valid: false, message: 'Cookie文件中没有Ozon相关Cookie' };
  }

  if (Object.keys(localStorage).length < 3) {
    logger.warn(`localStorage数量过少: ${Object.keys(localStorage).length}，可能不完整`);
  }

  return {
    valid: true,
    message: `Cookie可用 (${ozonCookieCount}条Ozon Cookie, ${Object.keys(localStorage).length}条localStorage)`,
  };
}

export async function validateOzonCookieForBrowsing(): Promise<OzonCookieValidationResult> {
  try {
    if (!fs.existsSync(COOKIE_FILE)) {
      return { valid: false, message: 'Cookie文件不存在' };
    }

    const content = fs.readFileSync(COOKIE_FILE, 'utf-8');
    const cookieData = JSON.parse(content);
    return validateOzonCookieDataAvailability(cookieData);
  } catch (error: any) {
    return { valid: false, message: `验证失败: ${error.message}` };
  }
}

// 验证Cookie是否有效
export async function validateOzonCookie(): Promise<OzonCookieValidationResult> {
  try {
    if (!fs.existsSync(COOKIE_FILE)) {
      return { valid: false, message: 'Cookie文件不存在' };
    }
    
    const content = fs.readFileSync(COOKIE_FILE, 'utf-8');
    const cookieData = JSON.parse(content);

    const availability = validateOzonCookieDataAvailability(cookieData);
    if (!availability.valid) {
      return availability;
    }

    const cookies = Array.isArray(cookieData.cookies) ? cookieData.cookies : [];
    const localStorage = cookieData.local_storage || {};
    return { valid: true, message: `Cookie有效 (${cookies.length}条Cookie, ${Object.keys(localStorage).length}条localStorage)` };
  } catch (error: any) {
    return { valid: false, message: `验证失败: ${error.message}` };
  }
}
