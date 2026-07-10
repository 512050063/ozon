import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const includeDirs = [
  'frontend/src',
  'backend/src',
  'backend/scripts',
];

const allowPatterns = [
  /backend[\\/](src[\\/]config[\\/]logger|scripts[\\/].*\.(test|spec)\.)/,
  /frontend[\\/]scripts[\\/].*\.(test|spec)\./,
  /frontend[\\/]src[\\/].*\.(test|spec)\./,
];

const allowFindingPatterns = [
  // One-off diagnostic and migration scripts intentionally write to stdout/stderr.
  /^backend\/scripts\//,
  /^backend\/src\/scripts\//,
  // Deferred mock flows: SMS verification, WeChat QR login, and membership payment.
  /^backend\/src\/controllers\/authController\.ts:.*模拟发送验证码/,
  /^frontend\/src\/views\/pages\/Login\.vue:.*微信登录/,
  /^frontend\/src\/views\/pages\/VIP\.vue:/,
  /^frontend\/src\/views\/settings\/account-info\/Index\.vue:.*发送验证码/,
];

const denyPattern = /\b(console\.(log|debug|warn|error)|debugger)\b/g;
const findings = [];

for (const dir of includeDirs) {
  walk(path.join(root, dir));
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  console.error(`\n${findings.length} console/debug finding(s)`);
  process.exit(1);
}

console.log('console output audit passed');

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ['node_modules', 'dist', '.git', 'data'].includes(entry.name)
      || /^_chrome_profile/.test(entry.name)
    ) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && /\.(vue|ts|js|mjs|cjs|py)$/.test(entry.name)) {
      scan(fullPath);
    }
  }
}

function scan(file) {
  const relative = path.relative(root, file).replace(/\\/g, '/');
  if (allowPatterns.some(pattern => pattern.test(relative))) return;

  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    denyPattern.lastIndex = 0;
    if (denyPattern.test(line)) {
      const finding = `${relative}:${index + 1}: ${line.trim()}`;
      if (!allowFindingPatterns.some(pattern => pattern.test(finding))) {
        findings.push(finding);
      }
    }
  });
}
