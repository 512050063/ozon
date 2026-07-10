import assert from 'node:assert/strict';
import {
  buildOrderProductDisplay,
  getOrderProductCount,
} from '../src/views/ozon/order-management/orderProductDisplay.js';

const order = {
  raw: {
    products: [
      {
        sku: '4847876562',
        quantity: 1,
        name: '蓝色织物的大象',
        image: 'https://example.com/a.jpg',
      },
      {
        sku: '4245432138',
        quantity: 2,
        name: '30x20x14 厘米的存储器，灰色',
        image: 'https://example.com/b.jpg',
      },
    ],
  },
};

const display = buildOrderProductDisplay(order, (name) => name);

assert.equal(getOrderProductCount(order), 2);
assert.equal(display.countLabel, '2个商品');
assert.equal(display.primaryLine, '1个 4847876562');
assert.equal(display.primaryName, '蓝色织物的大象');
assert.equal(display.items.length, 2);
assert.equal(display.items[1].quantityText, '2个 4245432138');
assert.equal(display.items[1].name, '30x20x14 厘米的存储器，灰色');

console.log('check-ozon-order-product-display passed');
