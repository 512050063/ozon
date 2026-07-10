import assert from 'assert';
import {
  createTranslationCacheHash,
  normalizeTranslationText,
  resolveProductNameTranslationsCore,
} from '../src/services/translationService';

assert.equal(normalizeTranslationText('  Беспроводные   наушники  '), 'Беспроводные наушники');
assert.equal(normalizeTranslationText('\n蓝牙耳机\t'), '蓝牙耳机');
assert.equal(createTranslationCacheHash('  Беспроводные   наушники  '), createTranslationCacheHash('Беспроводные наушники'));
assert.equal(createTranslationCacheHash('x'.repeat(1200)).length, 64);

const now = new Date('2026-06-30T08:00:00.000Z');
const cache = new Map<string, string>([
  ['Беспроводные наушники', '无线耳机'],
]);
let externalCalls = 0;
let usedChars = 0;

const cacheKey = (text: string) => `${text}|ru|zh`;

async function main() {
  const firstResult = await resolveProductNameTranslationsCore({
    texts: [
      'Беспроводные наушники',
      '  Беспроводные   наушники  ',
      'Детские часы',
      '蓝牙耳机',
      '',
    ],
    sourceLang: 'ru',
    targetLang: 'zh',
    now,
    monthlyLimitChars: 20,
    getCachedTranslations: async texts => new Map(
      texts
        .filter(text => cache.has(text))
        .map(text => [text, cache.get(text) || ''])
    ),
    providerAvailable: async () => true,
    getMonthlyUsage: async () => usedChars,
    addMonthlyUsage: async chars => {
      usedChars += chars;
    },
    translateMissingTexts: async texts => {
      externalCalls += 1;
      return new Map(texts.map(text => [text, text === 'Детские часы' ? '儿童手表' : text]));
    },
    saveCachedTranslations: async items => {
      for (const item of items) {
        cache.set(item.originalText, item.translatedText);
      }
    },
  });

  assert.equal(firstResult.translationConfigured, true);
  assert.equal(firstResult.quotaExceeded, false);
  assert.equal(externalCalls, 1);
  assert.equal(usedChars, 'Детские часы'.length);
  assert.deepEqual(
    firstResult.items.map(item => [item.sourceText, item.translatedText, item.status]),
    [
      ['Беспроводные наушники', '无线耳机', 'cached'],
      ['Детские часы', '儿童手表', 'translated'],
    ],
  );
  assert.equal(cache.get('Детские часы'), '儿童手表');

  const cachedOnlyResult = await resolveProductNameTranslationsCore({
    texts: ['Беспроводные наушники', 'Детские часы'],
    sourceLang: 'ru',
    targetLang: 'zh',
    now,
    monthlyLimitChars: 20,
    getCachedTranslations: async texts => new Map(
      texts
        .filter(text => cache.has(text))
        .map(text => [text, cache.get(text) || ''])
    ),
    providerAvailable: async () => false,
    getMonthlyUsage: async () => usedChars,
    addMonthlyUsage: async chars => {
      usedChars += chars;
    },
    translateMissingTexts: async () => {
      throw new Error('external translator should not be called for cached texts');
    },
    saveCachedTranslations: async () => {},
  });

  assert.equal(cachedOnlyResult.translationConfigured, true);
  assert.equal(cachedOnlyResult.items.every(item => item.status === 'cached'), true);

  const missingConfigResult = await resolveProductNameTranslationsCore({
    texts: ['Новый товар'],
    sourceLang: 'ru',
    targetLang: 'zh',
    now,
    monthlyLimitChars: 20,
    getCachedTranslations: async () => new Map(),
    providerAvailable: async () => false,
    getMonthlyUsage: async () => usedChars,
    addMonthlyUsage: async chars => {
      usedChars += chars;
    },
    translateMissingTexts: async () => {
      throw new Error('external translator should not be called without config');
    },
    saveCachedTranslations: async () => {},
  });

  assert.equal(missingConfigResult.translationConfigured, false);
  assert.equal(missingConfigResult.items[0].status, 'skipped');
  assert.equal(missingConfigResult.items[0].translatedText, '');

  const quotaResult = await resolveProductNameTranslationsCore({
    texts: ['Очень длинное название товара'],
    sourceLang: 'ru',
    targetLang: 'zh',
    now,
    monthlyLimitChars: 5,
    getCachedTranslations: async () => new Map(),
    providerAvailable: async () => true,
    getMonthlyUsage: async () => 0,
    addMonthlyUsage: async () => {
      throw new Error('quota should block usage updates');
    },
    translateMissingTexts: async () => {
      throw new Error('external translator should not be called over quota');
    },
    saveCachedTranslations: async () => {},
  });

  assert.equal(quotaResult.translationConfigured, true);
  assert.equal(quotaResult.quotaExceeded, true);
  assert.equal(quotaResult.items[0].status, 'quota_exceeded');

  assert.equal(cacheKey('Беспроводные наушники'), 'Беспроводные наушники|ru|zh');
  console.log('productNameTranslationService.test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
