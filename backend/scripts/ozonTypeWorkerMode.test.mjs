import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '../..');
const service = fs.readFileSync(path.join(root, 'backend/src/services/ozonTypeService.ts'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'backend/src/controllers/ozonTypeController.ts'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'worker/ozon-worker.py'), 'utf8');

assert.match(
  service,
  /const shouldUseLocalWorker = \(\) => process\.env\.OZON_BROWSER_WORKER_MODE === 'required'/,
  'type extraction should honor required local-worker mode',
);
assert.match(
  service,
  /hasActiveWorkerForUser\(userId\)/,
  'type extraction should check whether the local worker is online before creating a task',
);
assert.match(
  service,
  /type:\s*'type_extract_batch'[\s\S]*payload:\s*\{ urls: normalizedUrls, titles: fallbackTitles \}/,
  'batch type extraction should create a type_extract_batch worker task with titles for detail-page title backfill',
);
assert.match(
  service,
  /applyWorkerTypeTaskResult\(task\.result\)/,
  'batch status polling should apply worker results into type and search caches',
);
assert.match(
  service,
  /updateCachedOzonSearchProductDetails\(url,[\s\S]*title: normalizedResult\.title,[\s\S]*productType: normalizedResult\.type/,
  'type results should backfill title and product type into keyword search caches',
);
assert.match(
  controller,
  /batchExtractTypes\(urls, titles \|\| \{\}, req\.user!\.id\)/,
  'batch type controller should pass the current user id so cloud mode can route work to the local worker',
);
assert.match(
  controller,
  /extractProductType\(productUrl, req\.user!\.id\)/,
  'single type controller should pass the current user id so required worker mode can run',
);
assert.match(
  service,
  /extractProductType = async \(productUrl: string, userId\?: number\)/,
  'single type extraction should accept user id for required local-worker mode',
);
assert.match(
  service,
  /batchExtractTypes\(\[productUrl\], \{\}, userId\)/,
  'single type extraction should pass user id into the batch worker path',
);
assert.match(
  controller,
  /await ozonTypeService\.getBatchExtractStatus\(\)/,
  'batch type status controller should await worker task polling',
);
assert.match(
  worker,
  /if task_type == "type_extract_batch":[\s\S]*return execute_type_extract_batch\(config, payload, task_id\)/,
  'local worker should support type_extract_batch tasks',
);
