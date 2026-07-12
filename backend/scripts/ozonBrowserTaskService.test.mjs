import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const schema = fs.readFileSync(path.join(root, 'backend/prisma/schema.prisma'), 'utf8');

assert.match(schema, /model OzonBrowserWorker \{/);
assert.match(schema, /model OzonBrowserTask \{/);
assert.match(schema, /userId\s+Int/);
assert.match(schema, /tokenHash\s+String/);
assert.match(schema, /payload\s+Json/);
assert.match(schema, /result\s+Json\?/);

const servicePath = path.join(root, 'backend/src/services/ozonBrowserTaskService.ts');
assert.ok(fs.existsSync(servicePath), 'ozon browser task service should exist');
const service = fs.readFileSync(servicePath, 'utf8');
assert.match(service, /createWorkerRegistration/);
assert.match(service, /hashWorkerToken/);
assert.match(service, /authenticateWorkerToken/);
assert.match(service, /claimNextTask/);
assert.match(service, /completeTask/);
assert.match(service, /failTask/);
assert.match(service, /userId:\s*worker\.userId/);

const app = fs.readFileSync(path.join(root, 'backend/src/app.ts'), 'utf8');
assert.match(app, /ozonBrowserTaskRoutes/);
assert.match(app, /workerRoutes/);
assert.match(app, /app\.use\('\/api\/ozon\/browser'/);
assert.match(app, /app\.use\('\/api\/worker'/);
assert.match(app, /req\.path\.startsWith\('\/worker'\)/);
