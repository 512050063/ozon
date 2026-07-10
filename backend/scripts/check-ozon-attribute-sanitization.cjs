require('ts-node/register/transpile-only');
const assert = require('assert');

const { submitProductImport } = require('../src/services/ozonProductService');

async function captureAttributes(productData) {
  let capturedBody = null;
  const originalFetch = global.fetch;

  global.fetch = async (_url, options = {}) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ result: { task_id: 1 } }),
      text: async () => JSON.stringify({ result: { task_id: 1 } }),
    };
  };

  try {
    await submitProductImport(
      { clientId: 'test-client', apiKey: 'test-key' },
      productData
    );
  } finally {
    global.fetch = originalFetch;
  }

  return capturedBody?.items?.[0]?.attributes || [];
}

function createProductData(hiddenAttributes) {
  return {
    name: '测试商品',
    description: ' ',
    imageUrl: 'https://example.com/product.png',
    images: ['https://example.com/product.png'],
    price: 23,
    stock: 1,
    packageLength: 23,
    packageWidth: 12,
    packageHeight: 12,
    grossWeight: 12,
    hiddenAttributes,
    templateSnapshot: {
      hiddenAttributes: [
        {
          id: 8790,
          name: 'PDF 文件',
          type: 'string',
          description: '',
          is_required: false,
        },
        {
          id: 5613,
          name: '灵敏度，dB',
          type: 'string',
          description: '',
          is_required: false,
        },
      ],
      variantAttributes: [],
    },
  };
}

(async () => {
  const attrsWithInvalidPdf = await captureAttributes(
    createProductData({
      8790: '12',
      5613: '23',
    })
  );

  assert(
    !attrsWithInvalidPdf.some(item => item.id === 8790),
    'Invalid PDF URL attribute should be omitted from Ozon payload'
  );

  const normalStringAttr = attrsWithInvalidPdf.find(item => item.id === 5613);
  assert(normalStringAttr, 'Regular string attribute should remain in payload');
  assert.strictEqual(normalStringAttr.values[0].value, '23');

  const attrsWithValidPdf = await captureAttributes(
    createProductData({
      8790: 'https://example.com/manual.pdf',
      5613: '23',
    })
  );

  const pdfAttr = attrsWithValidPdf.find(item => item.id === 8790);
  assert(pdfAttr, 'Valid PDF URL attribute should remain in payload');
  assert.strictEqual(pdfAttr.values[0].value, 'https://example.com/manual.pdf');

  console.log('check-ozon-attribute-sanitization: ok');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
