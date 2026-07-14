import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const controllerPath = path.join(root, 'backend/src/controllers/alibabaController.ts');
const callbackPath = path.join(root, 'frontend/public/callback.html');

const controller = fs.readFileSync(controllerPath, 'utf8');
const callback = fs.readFileSync(callbackPath, 'utf8');

assert.match(
  controller,
  /buildAlibabaAuthState[\s\S]*?backendUrl/,
  '1688 authorize state should include the backend URL that initiated authorization',
);

assert.match(
  controller,
  /parseAlibabaAuthState[\s\S]*?userId[\s\S]*?stateStr\.split\(': '\)|parseAlibabaAuthState[\s\S]*?stateStr\.split\(':'\)/,
  '1688 token exchange should parse both structured and legacy state values',
);

assert.match(
  callback,
  /parseAuthState[\s\S]*?backendUrl/,
  'callback page should parse backendUrl from 1688 state',
);

assert.match(
  callback,
  /var stateInfo = parseAuthState\(stateParam\)[\s\S]*?stateInfo\.backendUrl[\s\S]*?getBackendUrl/,
  'callback page should prefer the state backendUrl over localStorage or current origin',
);

console.log('alibaba auth callback state tests passed');
