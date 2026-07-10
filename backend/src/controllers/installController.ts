import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import mysql from 'mysql2/promise';
import { createInstallLock, assertInstallUnlocked, getInstallLockStatus } from '../install/installLock';
import { runInstallEnvironmentChecks } from '../install/installEnvironmentService';
import { importBaselineBundle } from '../install/baselineDataService';
import { runProductionSeed } from '../install/installSeedService';
import logger from '../config/logger';

const execFileAsync = promisify(execFile);
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const WORKSPACE_ROOT = path.resolve(BACKEND_ROOT, '..');
const ENV_FILE = path.join(BACKEND_ROOT, '.env.production');

function jsonSuccess(res: Response, data: any, message = 'ok') {
  res.json({ success: true, data, message });
}

function jsonError(res: Response, error: any, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  res.status(500).json({ success: false, data: null, message });
}

export async function getInstallStatus(req: Request, res: Response) {
  try {
    jsonSuccess(res, getInstallLockStatus());
  } catch (error) {
    jsonError(res, error, '获取安装状态失败');
  }
}

export async function runInstallCheck(req: Request, res: Response) {
  try {
    const checks = await runInstallEnvironmentChecks(WORKSPACE_ROOT);
    jsonSuccess(res, checks, '环境检测完成');
  } catch (error) {
    jsonError(res, error, '环境检测失败');
  }
}

export async function configureDatabase(req: Request, res: Response) {
  try {
    assertInstallUnlocked();
    const payload = req.body || {};
    const host = String(payload.host || '127.0.0.1').trim();
    const port = Number(payload.port || 3306);
    const database = String(payload.database || '').trim();
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '');

    if (!database || !username) {
      return res.status(400).json({ success: false, data: null, message: '数据库名和用户名不能为空' });
    }

    const connection = await mysql.createConnection({ host, port, user: username, password, multipleStatements: false });
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, '``')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.end();

    const databaseUrl = `mysql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}?charset=utf8mb4`;
    fs.writeFileSync(
      ENV_FILE,
      [
        `DATABASE_URL="${databaseUrl}"`,
        `JWT_SECRET="${payload.jwtSecret || generateJwtSecret()}"`,
        'NODE_ENV="production"',
        `PORT=${Number(payload.backendPort || process.env.PORT || 3000)}`,
        `CORS_ORIGIN="${payload.corsOrigin || ''}"`,
        `CHROME_PATH="${payload.chromePath || process.env.CHROME_PATH || ''}"`,
        '',
      ].join('\n'),
      'utf8',
    );

    await execFileAsync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['prisma', 'db', 'push', '--schema', path.join(BACKEND_ROOT, 'prisma/schema.prisma')],
      {
        cwd: BACKEND_ROOT,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        timeout: 120000,
      },
    );

    jsonSuccess(res, { envFile: ENV_FILE, database }, '数据库创建并同步完成');
  } catch (error) {
    logger.error('安装数据库配置失败:', error);
    jsonError(res, error, '数据库配置失败');
  }
}

export async function importBaselineData(req: Request, res: Response) {
  try {
    assertInstallUnlocked();
    const result = await importBaselineBundle(req.body);
    jsonSuccess(res, result, '基础数据导入完成');
  } catch (error) {
    jsonError(res, error, '基础数据导入失败');
  }
}

export async function createAdmin(req: Request, res: Response) {
  try {
    assertInstallUnlocked();
    const result = await runProductionSeed({
      admin: {
        username: String(req.body?.username || '').trim(),
        password: String(req.body?.password || ''),
        nickname: String(req.body?.nickname || '').trim() || undefined,
      },
    });
    jsonSuccess(res, result, '管理员创建完成');
  } catch (error) {
    jsonError(res, error, '管理员创建失败');
  }
}

export async function finalizeInstall(req: Request, res: Response) {
  try {
    assertInstallUnlocked();
    const status = createInstallLock();
    jsonSuccess(res, status, '安装完成');
  } catch (error) {
    jsonError(res, error, '完成安装失败');
  }
}

function generateJwtSecret() {
  return Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}
