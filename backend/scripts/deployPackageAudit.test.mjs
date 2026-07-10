import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const auditScript = path.join(root, 'scripts/audit-deploy-package.mjs');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ozon-deploy-audit-'));

try {
  const cleanPackage = path.join(tempRoot, 'clean');
  fs.mkdirSync(path.join(cleanPackage, 'backend/scripts/ozon'), { recursive: true });
  fs.mkdirSync(path.join(cleanPackage, 'frontend/dist'), { recursive: true });
  fs.writeFileSync(path.join(cleanPackage, 'backend/scripts/ozon/ozon_search.py'), '# ok\n');
  fs.writeFileSync(path.join(cleanPackage, 'frontend/dist/index.html'), '<div></div>\n');

  const cleanOutput = execFileSync(
    process.execPath,
    [auditScript, '--strict', '--package-root', cleanPackage],
    { encoding: 'utf8' },
  );
  assert.match(cleanOutput, /deploy package audit passed/);

  const dirtyPackage = path.join(tempRoot, 'dirty');
  fs.mkdirSync(path.join(dirtyPackage, 'backend/scripts/data/_chrome_profile'), { recursive: true });
  fs.mkdirSync(path.join(dirtyPackage, 'backend/data'), { recursive: true });
  fs.writeFileSync(path.join(dirtyPackage, 'backend/data/ozon_cookies.json'), '{}\n');
  fs.writeFileSync(path.join(dirtyPackage, 'backend/.env.production'), 'JWT_SECRET=secret\n');
  fs.writeFileSync(path.join(dirtyPackage, 'backend/scripts/data/_chrome_profile/LOCK'), '');

  assert.throws(
    () => execFileSync(
      process.execPath,
      [auditScript, '--strict', '--package-root', dirtyPackage],
      { encoding: 'utf8', stdio: 'pipe' },
    ),
    error => {
      const output = `${error.stdout || ''}\n${error.stderr || ''}`;
      assert.match(output, /backend\/data\/ozon_cookies\.json/);
      assert.match(output, /backend\/\.env\.production/);
      assert.match(output, /backend\/scripts\/data\/_chrome_profile\//);
      return true;
    },
  );

  console.log('deployPackageAudit.test passed');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
