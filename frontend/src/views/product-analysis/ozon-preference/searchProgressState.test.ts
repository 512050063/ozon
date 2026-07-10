import * as assert from 'node:assert/strict';
import {
  SEARCH_PROGRESS_STATE_KEY,
  clearSearchProgressState,
  getSearchProgressCopy,
  readSearchProgressState,
  writeSearchProgressState,
  type SearchProgressState,
} from './searchProgressState';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const now = 1_800_000;

const storage = new MemoryStorage();
const state: SearchProgressState = {
  keyword: '耳机',
  category: '蓝牙耳机',
  stage: 'fetching',
  progress: 42,
  startedAt: now - 30_000,
  updatedAt: now,
};

writeSearchProgressState(storage, state);
assert.deepEqual(readSearchProgressState(storage, now + 10_000), state);

writeSearchProgressState(storage, { ...state, progress: 130, updatedAt: now + 20_000 });
assert.equal(readSearchProgressState(storage, now + 20_000)?.progress, 100);

writeSearchProgressState(storage, { ...state, updatedAt: now - 180_000 });
assert.equal(readSearchProgressState(storage, now), null);
assert.equal(storage.getItem(SEARCH_PROGRESS_STATE_KEY), null);

const startupCopy = getSearchProgressCopy('startup');
assert.equal(startupCopy.title, '检查启动状态');
assert.match(startupCopy.subtitle, /任务/);

const environmentCopy = getSearchProgressCopy('environment');
assert.equal(environmentCopy.title, '检测语言货币环境');

const fetchingCopy = getSearchProgressCopy('fetching');
assert.equal(fetchingCopy.title, '获取数据');

const parsingCopy = getSearchProgressCopy('parsing');
assert.equal(parsingCopy.title, '解析商品信息');

clearSearchProgressState(storage);
assert.equal(storage.getItem(SEARCH_PROGRESS_STATE_KEY), null);

console.log('search progress state assertions passed');
