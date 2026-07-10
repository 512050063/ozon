import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const reportsDir = path.join(root, 'docs', 'test-reports');

fs.mkdirSync(reportsDir, { recursive: true });

const timestamp = formatTimestamp(new Date());
const commands = [
  {
    id: 'backend-build',
    title: 'Backend build',
    cwd: path.join(root, 'backend'),
    ...npmInvocation('run', 'build'),
  },
  {
    id: 'frontend-build',
    title: 'Frontend build',
    cwd: path.join(root, 'frontend'),
    ...npmInvocation('run', 'build'),
  },
  {
    id: 'script-tests',
    title: 'Unified script tests',
    cwd: root,
    command: process.execPath,
    args: [path.join(root, 'scripts', 'run-script-tests.mjs')],
  },
  {
    id: 'console-audit',
    title: 'Console output audit',
    cwd: root,
    command: process.execPath,
    args: [path.join(root, 'scripts', 'audit-console-output.mjs')],
  },
  {
    id: 'blackbox-smoke',
    title: 'Black-box smoke',
    cwd: path.join(root, 'frontend'),
    command: process.execPath,
    args: [path.join(root, 'frontend', 'scripts', 'blackbox-smoke.test.mjs')],
  },
];

const results = commands.map(runCommand);
const reportFile = path.join(reportsDir, `${timestamp}-project-health.md`);
const failed = results.filter(result => result.status !== 'pass');

fs.writeFileSync(reportFile, renderReport(results), 'utf8');

if (failed.length > 0) {
  console.error(`Project health audit failed: ${failed.length} check(s) failed`);
  console.error(`Report: ${path.relative(root, reportFile)}`);
  process.exit(1);
}

console.log('Project health audit passed');
console.log(`Report: ${path.relative(root, reportFile)}`);

function runCommand(check) {
  const outputFile = path.join(reportsDir, `${timestamp}-${check.id}.txt`);
  const startedAt = Date.now();
  const result = spawnSync(check.command, check.args, {
    cwd: check.cwd,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    shell: false,
    env: {
      ...process.env,
      E2E_BASE_URL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    },
  });

  const output = [
    `$ ${[check.command, ...check.args].join(' ')}`,
    `cwd: ${path.relative(root, check.cwd) || '.'}`,
    '',
    result.error ? String(result.error.stack || result.error.message || result.error) : '',
    result.stdout || '',
    result.stderr || '',
  ].join('\n');

  fs.writeFileSync(outputFile, output, 'utf8');

  return {
    ...check,
    durationMs: Date.now() - startedAt,
    exitCode: result.status,
    signal: result.signal,
    status: result.status === 0 ? 'pass' : 'fail',
    outputFile,
  };
}

function renderReport(results) {
  const lines = [
    '# Project Health Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    ...results.map(result => {
      const output = path.relative(reportsDir, result.outputFile).replace(/\\/g, '/');
      const suffix = result.signal ? `, signal ${result.signal}` : '';
      return `- ${result.title}: ${result.status} (${Math.round(result.durationMs / 1000)}s, exit ${result.exitCode}${suffix}) - \`${output}\``;
    }),
    '',
    '## Notes',
    '',
    '- Black-box smoke requires the frontend dev server to be reachable at `E2E_BASE_URL` or `http://localhost:5173`.',
    '- SMS verification, WeChat scan login, and membership payment mock flows remain deferred by request.',
    '- Existing frontend build warnings are recorded in the frontend build output file.',
    '',
  ];

  return `${lines.join('\n')}\n`;
}

function formatTimestamp(date) {
  const pad = value => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join('');
}

function npmInvocation(...args) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', ['npm', ...args].join(' ')],
    };
  }

  return {
    command: 'npm',
    args,
  };
}
