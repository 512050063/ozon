import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const targets = [
  'backend/scripts',
  'backend/src/scripts',
  'frontend/scripts',
  'frontend/src',
];

const filters = new Set(process.argv.slice(2).map(value => value.replace(/\\/g, '/')));
const files = [];

for (const target of targets) {
  walk(path.join(root, target), files);
}

const testFiles = files
  .map(file => path.relative(root, file).replace(/\\/g, '/'))
  .filter(file => filters.size === 0 || [...filters].some(filter => file.includes(filter)))
  .sort();

let failed = 0;
const failures = [];

for (const relative of testFiles) {
  const absolute = path.join(root, relative);
  const { cmd, args, cwd } = commandFor(relative, absolute);
  process.stdout.write(`\n[TEST] ${relative}\n`);
  const code = await run(cmd, args, cwd);
  if (code !== 0) {
    failed++;
    failures.push(relative);
  }
}

if (failed > 0) {
  console.error(`\n${failed} script test(s) failed:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`\n${testFiles.length} script test(s) passed`);

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }

    if (entry.isFile() && /\.(test|spec)\.(mjs|cjs|js|ts)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
}

function commandFor(relative, absolute) {
  const project = relative.startsWith('frontend/') ? 'frontend' : 'backend';
  const cwd = path.join(root, project);

  if (absolute.endsWith('.ts')) {
    if (relative.startsWith('frontend/')) {
      const tsNodeEsm = path.join(root, 'backend', 'node_modules', 'ts-node', 'esm.mjs');
      return {
        cmd: process.execPath,
        args: ['--loader', pathToFileURL(tsNodeEsm).href, '--experimental-specifier-resolution=node', absolute],
        cwd,
      };
    }

    const tsNodeBin = path.join(root, 'backend', 'node_modules', 'ts-node', 'dist', 'bin.js');
    return {
      cmd: process.execPath,
      args: [tsNodeBin, '--transpile-only', absolute],
      cwd,
    };
  }

  return {
    cmd: process.execPath,
    args: [absolute],
    cwd,
  };
}

function run(cmd, args, cwd) {
  return new Promise(resolve => {
    let child;
    try {
      child = spawn(cmd, args, {
        cwd,
        stdio: 'inherit',
        shell: false,
        windowsHide: true,
      });
    } catch (error) {
      console.error(error);
      resolve(1);
      return;
    }
    child.on('error', error => {
      console.error(error);
      resolve(1);
    });
    child.on('close', resolve);
  });
}
