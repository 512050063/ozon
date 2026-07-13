import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const source = fs.readFileSync(path.join(root, 'backend/scripts/ozon/ozon_search.py'), 'utf8');

assert.match(
  source,
  /const combinedText = normalizeSpaces\(texts\.join\(' '\)\)/,
  'Ozon card parser should inspect combined card text for rating/review fragments split across nodes',
);
assert.match(
  source,
  /const ratingMatch = combinedText\.match/,
  'Ozon card parser should recover rating from combined text when it is not a standalone text node',
);
assert.match(
  source,
  /const reviewSource = combinedText\.replace\(/,
  'Ozon card parser should remove rating fragments before extracting review count',
);
assert.match(
  source,
  /const reviewMatches = Array\.from\(reviewSource\.matchAll/,
  'Ozon card parser should consider all review-count candidates and use the nearest one before the review label',
);
assert.match(
  source,
  /reviewMatches\[reviewMatches\.length - 1\]/,
  'Ozon card parser should use the last number group before the review label, not earlier price or rating numbers',
);
