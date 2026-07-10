import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createInstallLock,
  getInstallLockStatus,
} from '../src/install/installLock';
import { LINUX_CHROME_CANDIDATES } from '../src/install/installEnvironmentService';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ozon-install-lock-'));
const lockFile = path.join(tempDir, 'install.lock');

try {
  const initial = getInstallLockStatus(lockFile);
  assert.equal(initial.installed, false);
  assert.equal(initial.lockFile, lockFile);

  const locked = createInstallLock(lockFile);
  assert.equal(locked.installed, true);
  assert.ok(locked.lockedAt);

  const content = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  assert.ok(content.lockedAt);
  assert.equal(content.version, 1);

  assert.ok(LINUX_CHROME_CANDIDATES.includes('/usr/bin/google-chrome'));
  assert.ok(LINUX_CHROME_CANDIDATES.includes('/usr/bin/chromium'));

  console.log('installLock.test passed');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
