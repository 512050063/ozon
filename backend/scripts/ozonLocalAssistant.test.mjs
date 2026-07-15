import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const assistantPath = path.join(root, 'worker/ozon-assistant.py');

assert.ok(fs.existsSync(assistantPath), 'local Ozon assistant should exist');

const assistant = fs.readFileSync(assistantPath, 'utf8');

assert.match(assistant, /DEFAULT_HOST\s*=\s*["']127\.0\.0\.1["']/);
assert.match(assistant, /DEFAULT_PORT\s*=\s*17666/);
assert.match(assistant, /Access-Control-Allow-Origin/);
assert.match(assistant, /Access-Control-Allow-Private-Network/);
assert.match(assistant, /def handle_health/);
assert.match(assistant, /def handle_env_check/);
assert.match(assistant, /def handle_project_select/);
assert.match(assistant, /def handle_install_playwright/);
assert.match(assistant, /def handle_worker_status/);
assert.match(assistant, /def handle_worker_start/);
assert.match(assistant, /def handle_worker_stop/);
assert.match(assistant, /def stop_worker_process/);
assert.match(assistant, /MIN_PYTHON_VERSION\s*=\s*\(3,\s*10\)/);
assert.match(assistant, /pythonVersion/);
assert.match(assistant, /playwright/);
assert.match(assistant, /pip", "install", "playwright"/);
assert.match(assistant, /tkinter/);
assert.match(assistant, /\/project\/select/);
assert.match(assistant, /\/env\/install-playwright/);
assert.match(assistant, /was_running = get_worker_running\(\)/);
assert.match(assistant, /stop_worker_process\(\)/);
assert.match(assistant, /本机采集器已重启/);
assert.match(assistant, /worker\.config\.json/);
assert.match(assistant, /ozon-worker\.py/);
assert.match(assistant, /subprocess\.Popen/);
