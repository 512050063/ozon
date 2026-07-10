import assert from 'assert';

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getVariantAttributeOrder(attribute) {
  const normalized = normalizeName(attribute.name);
  if (
    normalized.includes('主题标签') ||
    normalized.includes('hashtag') ||
    normalized.includes('хэштег') ||
    normalized.includes('#')
  ) {
    return 10;
  }
  if (normalized === '简介' || normalized.includes('简介')) {
    return 20;
  }
  return 100;
}

function sortVariantAttributes(attributes) {
  return attributes
    .map((attribute, index) => ({ attribute, index }))
    .sort((left, right) => {
      const orderDiff = getVariantAttributeOrder(left.attribute) - getVariantAttributeOrder(right.attribute);
      return orderDiff || left.index - right.index;
    })
    .map(item => item.attribute);
}

const sorted = sortVariantAttributes([
  { id: 4191, name: '简介' },
  { id: 9048, name: '#主题标签' },
  { id: 3000, name: '性别' },
]);

assert.deepStrictEqual(sorted.map(item => item.name), ['#主题标签', '简介', '性别']);

console.log('productTemplateDisplayOrder.test passed');
