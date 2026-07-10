import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(backendRoot, '..');

for (const envFile of ['.env.production', '.env']) {
  const envPath = path.join(backendRoot, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const baselineTables = [
  'ozon_error_codes',
  'ozon_categories',
  'ozon_product_templates',
  'ozon_category_attributes',
  'ozon_attribute_values',
  'translation_cache',
];

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL 未配置，无法导出基础数据包');
  process.exit(1);
}

const outputArgIndex = process.argv.indexOf('--output');
const outputFile = outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
  ? path.resolve(process.argv[outputArgIndex + 1])
  : path.join(
    workspaceRoot,
    'deploy',
    'seed-bundles',
    `baseline-${new Date().toISOString().slice(0, 10)}.json`,
  );

const connection = await mysql.createConnection({
  uri: sanitizeMysqlUri(databaseUrl),
  supportBigNumbers: true,
  bigNumberStrings: true,
});

try {
  const tables = {};
  for (const table of baselineTables) {
    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    tables[table] = rows.map(normalizeRow);
  }

  const bundle = {
    version: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    tables,
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  console.log(`基础数据包已导出: ${outputFile}`);
} finally {
  await connection.end();
}

function normalizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value instanceof Date) return [key, value.toISOString()];
      if (typeof value === 'bigint') return [key, value.toString()];
      if (Buffer.isBuffer(value)) return [key, value.toString('utf8')];
      return [key, value];
    }),
  );
}

function sanitizeMysqlUri(uri) {
  const url = new URL(uri);
  url.searchParams.delete('collation');
  return url.toString();
}
