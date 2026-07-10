import fs from 'fs';
import path from 'path';

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_LOCK_FILE = path.join(BACKEND_ROOT, 'data', 'install.lock');

export interface InstallLockStatus {
  installed: boolean;
  lockFile: string;
  lockedAt?: string;
}

export function getInstallLockStatus(lockFile = DEFAULT_LOCK_FILE): InstallLockStatus {
  if (!fs.existsSync(lockFile)) {
    return { installed: false, lockFile };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    return {
      installed: true,
      lockFile,
      lockedAt: parsed.lockedAt,
    };
  } catch {
    return { installed: true, lockFile };
  }
}

export function assertInstallUnlocked(lockFile = DEFAULT_LOCK_FILE) {
  const status = getInstallLockStatus(lockFile);
  if (status.installed && process.env.INSTALL_ALLOW_RESET !== 'true') {
    throw new Error('系统已完成安装，安装接口已锁定');
  }
}

export function createInstallLock(lockFile = DEFAULT_LOCK_FILE): InstallLockStatus {
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  const payload = {
    lockedAt: new Date().toISOString(),
    version: 1,
  };
  fs.writeFileSync(lockFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return getInstallLockStatus(lockFile);
}
