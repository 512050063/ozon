import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const routes = fs.readFileSync(path.join(root, 'backend/src/routes/workerRoutes.ts'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'backend/src/controllers/ozonBrowserTaskController.ts'), 'utf8');
const taskService = fs.readFileSync(path.join(root, 'backend/src/services/ozonBrowserTaskService.ts'), 'utf8');
const typeService = fs.readFileSync(path.join(root, 'backend/src/services/ozonTypeService.ts'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'worker/ozon-worker.py'), 'utf8');

assert.match(routes, /router\.post\('\/tasks\/:id\/progress', workerProgressTask\)/, 'worker routes should expose a task progress endpoint');
assert.match(controller, /progressTask\(worker, taskId, req\.body\?\.progress \|\| \{\}\)/, 'worker controller should accept progress payloads');
assert.match(taskService, /export const progressTask = async/, 'task service should support partial task progress updates');
assert.match(taskService, /progressResults/, 'task progress should store incremental result rows');
assert.match(typeService, /applyWorkerTypeTaskResult\(task\.result\)/, 'type status polling should apply task result payloads');
assert.match(typeService, /task\.status === 'success'/, 'type status polling should still finish when the worker task succeeds');
assert.match(worker, /def progress_task\(config: dict, task_id: int, progress\)/, 'local worker should report task progress to the backend');
assert.match(worker, /subprocess\.Popen/, 'local worker should stream script output instead of waiting for subprocess.run');
assert.match(worker, /on_json_line/, 'local worker should call a callback for each JSON result line');
assert.match(worker, /progress_task\(config, task_id, \{"results": \[parsed\]\}\)/, 'type batch worker should report each extracted type row immediately');
