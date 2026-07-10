export const getProductImage = (product: any): string => {
  if (product.product?.primaryImage) return product.product.primaryImage;
  const primaryImages = product.product?.primaryImages;
  if (primaryImages && primaryImages.length) return primaryImages[0];
  const images = product.product?.images;
  if (images && images.length) return images[0];
  if (product.primaryImage) return product.primaryImage;
  return '';
};

export const getCategoryName = (product: any): string => {
  const fullPath = product.categoryName ||
    product.product.categoryName ||
    product.product.ozonCategoryName ||
    product.product.categoryPath ||
    product.categoryPath ||
    product.product.category.name ||
    '-';

  if (fullPath === '-' || !fullPath.includes('/')) {
    return fullPath;
  }

  const parts = fullPath.split('/');
  return parts[parts.length - 1];
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch (error) {
    return dateString;
  }
};

export const formatTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
};

export const formatPrice = (price: number): string => {
  try {
    const numPrice = typeof price === 'number' ? price : parseFloat(price);
    if (isNaN(numPrice)) {
      return '0,00';
    }
    return numPrice.toFixed(2).replace('.', ',');
  } catch (error) {
    return '0,00';
  }
};

export const getColorIndexColor = (colorIndex: string): string => {
  if (!colorIndex) return '#94a3b8';
  if (colorIndex.includes('GREEN')) return '#22c55e';
  if (colorIndex.includes('YELLOW')) return '#eab308';
  if (colorIndex.includes('RED')) return '#ef4444';
  return '#94a3b8';
};

export const getColorIndexBg = (product: any): string => {
  const p = product?.product || {};
  const colorIndex = p.ozonOriginalData?.price_indexes?.color_index || '';
  if (!colorIndex) return '#f3f4f6';
  if (colorIndex.includes('GREEN')) return '#dcfce7';
  if (colorIndex.includes('YELLOW')) return '#fef9c3';
  if (colorIndex.includes('RED')) return '#fee2e2';
  return '#f3f4f6';
};

export const getColorIndexTextShort = (colorIndex: string): string => {
  if (colorIndex.includes('GREEN')) return '有利';
  if (colorIndex.includes('YELLOW')) return '不利';
  if (colorIndex.includes('RED')) return '不利';
  if (colorIndex.includes('WITHOUT_INDEX')) return '没有指数';
  return '没有指数';
};

export const getSkuDisplay = (product: any): string => {
  const sku = product.sku || product.product.ozonSku;
  if (sku === 0 || sku === '0') {
    return 'SKU未创建';
  }
  if (sku && sku !== '' && sku !== '0') {
    return `SKU ${sku}`;
  }
  return 'SKU未创建';
};

export const getOfferId = (product: any): string => {
  if (product.offerId) return product.offerId;
  const p = product.product;
  if (p.offerId) return p.offerId;
  if (p.ozonOfferId) return p.ozonOfferId;
  const sku = getSkuDisplay(product);
  if (sku && sku !== 'SKU未创建') return sku;
  return '';
};

export const getOzonProductId = (product: any): string => {
  return String(
    product?.productId ||
    product?.ozonProductId ||
    product?.product?.productId ||
    product?.product?.ozonProductId ||
    ''
  );
};

export const getApiProductId = (product: any): string => {
  return String(
    product?.productId ||
    product?.ozonProductId ||
    product?.product?.ozonProductId ||
    ''
  );
};

export const isArchivedProduct = (product: any): boolean => {
  return product?.status === 'archived' || product?.product?.isArchived === true;
};
