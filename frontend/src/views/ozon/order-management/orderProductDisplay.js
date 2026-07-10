const getOrderProducts = (order) => {
  if (Array.isArray(order?.raw?.products) && order.raw.products.length > 0) {
    return order.raw.products;
  }
  if (Array.isArray(order?.products) && order.products.length > 0) {
    return order.products;
  }
  return [];
};

const normalizeQuantity = (value) => {
  const quantity = Number(value || 0);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const pickImage = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = pickImage(...value);
      if (nested) return nested;
      continue;
    }
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

export const getOrderProductCount = (order) => getOrderProducts(order).length;

export const buildOrderProductDisplay = (order, translateName = (name) => name) => {
  const products = getOrderProducts(order);
  const items = products.map((product) => {
    const quantity = normalizeQuantity(product?.quantity);
    const sku = String(product?.sku || product?.offer_id || product?.product_id || '-');
    const name = translateName(String(product?.name || product?.offer_id || '商品')) || '商品';
    const image = pickImage(product?.image, product?.primary_image, product?.imageUrl, product?.image_url);

    return {
      quantity,
      sku,
      name,
      image,
      quantityText: `${quantity}个 ${sku}`,
    };
  });

  const primary = items[0] || {
    quantityText: '-',
    sku: '-',
    name: '-',
    image: '',
  };

  return {
    count: items.length,
    countLabel: items.length > 1 ? `${items.length}个商品` : '',
    primaryLine: primary.quantityText,
    primaryName: primary.name,
    primaryImage: primary.image,
    items,
  };
};
