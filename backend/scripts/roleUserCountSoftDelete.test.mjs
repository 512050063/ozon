import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const controller = fs.readFileSync(path.join(root, 'backend/src/controllers/roleManagementController.ts'), 'utf8');

assert.match(
  controller,
  /userCountMap\.set\(item\.roleId,\s*item\._count\._all\)/,
  'Role user counts should be built from an explicit active-user groupBy result',
);

assert.match(
  controller,
  /prisma\.user\.groupBy\([\s\S]*by:\s*\['roleId'\][\s\S]*where:\s*\{\s*deletedAt:\s*null\s*\}/,
  'Role user counts should exclude soft-deleted users',
);

assert.match(
  controller,
  /prisma\.user\.count\([\s\S]*where:\s*\{\s*roleId:\s*parseInt\(id\)[\s\S]*deletedAt:\s*null[\s\S]*\}/,
  'Role deletion guard should only block roles assigned to non-deleted users',
);

assert.doesNotMatch(
  controller,
  /userCount:\s*role\._count\.users/,
  'Role list should not expose Prisma relation counts that include soft-deleted users',
);

console.log('roleUserCountSoftDelete.test passed');
