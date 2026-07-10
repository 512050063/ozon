import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panelSource = readFileSync('src/views/settings/api-config/components/ApiConfigPanel.vue', 'utf8');
const pageSource = readFileSync('src/views/settings/api-config/Index.vue', 'utf8');

for (const className of [
  'api-config-form',
  'api-config-field',
  'api-config-label',
  'api-config-actions',
  'api-config-button',
]) {
  assert.match(panelSource, new RegExp(className), `ApiConfigPanel should use ${className}`);
}

for (const className of [
  'alibaba-config-form',
  'api-config-field',
  'api-config-label',
  'api-config-actions',
  'api-config-button',
]) {
  assert.match(pageSource, new RegExp(className), `1688 text config should use ${className}`);
}

assert.doesNotMatch(panelSource, /api-config-value/, 'ApiConfigPanel readonly state should keep input boxes visible');
assert.doesNotMatch(pageSource, /api-config-value/, '1688 readonly state should keep input boxes visible');
assert.match(panelSource, /:readonly="!isEditing"/, 'ApiConfigPanel inputs should be readonly until editing');
assert.match(pageSource, /:readonly="editingPlatform !== '1688'"/, '1688 inputs should be readonly until editing');
assert.match(panelSource, /api-config-button--primary/, 'text config save/edit button should use primary style');
assert.match(panelSource, /api-config-button--secondary/, 'text config cancel button should use secondary style');
assert.match(panelSource, /api-config-button--success/, 'text config test button should use success style');
assert.match(pageSource, /api-config-button--primary/, '1688 text config button should use primary style');
assert.match(pageSource, /api-config-button--secondary/, '1688 text config cancel button should use secondary style');

console.log('apiConfigFormStyle.test passed');
