import prisma from '../config/database';
import { getOrders } from '../services/ozonOrderService';

const pickProductIdentifiers = (product: any): string[] => (
  [product?.product_id, product?.sku, product?.offer_id]
    .filter(value => value !== null && value !== undefined && value !== '')
    .map(value => String(value))
);

const firstImage = (product: { primaryImage?: string | null; images?: any }) => {
  if (product.primaryImage) {
    return product.primaryImage;
  }
  return Array.isArray(product.images)
    ? product.images.find(value => typeof value === 'string' && value)
    : undefined;
};

async function main() {
  const order = await prisma.ozonOrder.findFirst({
    orderBy: { inProcessAt: 'desc' },
    select: {
      ozonStoreId: true,
      products: true,
      raw: true,
    },
  });

  if (!order) {
    console.log('No orders found, skipping order image verification.');
    return;
  }

  const orderProducts = [
    ...(Array.isArray(order.products) ? order.products : []),
    ...(Array.isArray((order.raw as any)?.products) ? (order.raw as any).products : []),
  ];
  const identifiers = Array.from(new Set(orderProducts.flatMap(pickProductIdentifiers)));

  const matchingProducts = await prisma.product.findMany({
    where: {
      OR: [
        { ozonProductId: { in: identifiers } },
        { ozonSku: { in: identifiers } },
        { offerId: { in: identifiers } },
      ],
    },
    select: {
      primaryImage: true,
      images: true,
    },
  });
  const hasLocalImage = matchingProducts.some(product => Boolean(firstImage(product)));

  if (!hasLocalImage) {
    console.log('No local product image matches the latest order, skipping order image verification.');
    return;
  }

  const response = await getOrders(order.ozonStoreId, { limit: 20, offset: 0 });
  const hasReturnedImage = response.orders.some(item => {
    const products = [
      ...(Array.isArray(item.products) ? item.products : []),
      ...(Array.isArray(item.raw?.products) ? item.raw.products : []),
    ];
    return products.some((product: any) => typeof product?.image === 'string' && product.image);
  });

  if (!hasReturnedImage) {
    throw new Error('Expected order list products to include local product images.');
  }

  console.log('Order product image verification passed.');
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
