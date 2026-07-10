import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const packageRootArgIndex = args.indexOf('--package-root');
const packageRoot = packageRootArgIndex >= 0 && args[packageRootArgIndex + 1]
  ? path.resolve(args[packageRootArgIndex + 1])
  : root;

const forbiddenPatterns = [
  /^backend\/data\/(?!\.gitkeep$)/,
  /^backend\/scripts\/data\/ozon_cookies\.json$/,
  /^backend\/scripts\/data\/ozon_type_cache\.json$/,
  /^backend\/scripts\/data\/cache\//,
  /^backend\/scripts\/data\/_chrome_profile/,
  /^backend\/scripts\/data\/_ozon_.*_result\.json$/,
  /^backend\/scripts\/data\/_debug_.*\.png$/,
  /^backend\/scripts\/data\/_diag_.*\.png$/,
  /^backend\/scripts\/data\/(?!\.gitkeep$)/,
  /^backend\/scripts\/ozon\/_chrome_profile/,
  /^backend\/scripts\/ozon\/__pycache__/,
  /^backend\/\.env(?:$|\.local$|\.production$|(?:\.[^.]+)*\.local$)/,
  /^frontend\/\.env(?:$|\.local$|\.production$|(?:\.[^.]+)*\.local$)/,
  /^frontend\/public\/images\/(?!\.gitkeep$)/,
  /^backend\/frontend\/public\/images\/(?!\.gitkeep$)/,
  /^node_modules(?:\/|$)/,
  /^backend\/node_modules(?:\/|$)/,
  /^frontend\/node_modules(?:\/|$)/,
];

const ignoredDirs = new Set(['.git', '.superpowers', '.agents']);
const findings = [];

walk(packageRoot);

if (findings.length > 0) {
  const prefix = strict ? 'deploy package forbidden file' : 'local runtime file';
  for (const finding of findings) {
    console.log(`${prefix}: ${finding}`);
  }

  if (strict) {
    console.error(`\n${findings.length} forbidden deploy package file(s) found`);
    process.exit(1);
  }

  console.log(`\n${findings.length} local runtime file(s) classified; use --strict for package verification`);
  process.exit(0);
}

console.log('deploy package audit passed');

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(packageRoot, fullPath).replace(/\\/g, '/');

    if (forbiddenPatterns.some(pattern => pattern.test(relative))) {
      findings.push(relative + (entry.isDirectory() ? '/' : ''));
      if (entry.isDirectory()) continue;
    }

    if (entry.isDirectory()) {
      walk(fullPath);
    }
  }
}
