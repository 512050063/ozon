export const updateModuleRouteMap: Record<string, string[]> = {
  'product-management': ['/ozon/product-management'],
  'order-management': ['/ozon/order-management'],
  'finance-report': ['/ozon/finance-report'],
  'promotions': ['/ozon/promotions'],
  'ozon-preference': ['/product-analysis/ozon-preference', '/settings/api-config'],
  'store-management': ['/ozon/store-management'],
  'api-config': ['/settings/api-config'],
};

export const getUpdateModuleForPath = (path: string): string => {
  return (
    Object.entries(updateModuleRouteMap).find(([, routePaths]) =>
      routePaths.some(routePath => path.startsWith(routePath))
    )?.[0] || ''
  );
};

export const shouldShowUpdateForPath = (module: string, path: string): boolean => {
  if (!module) return false;
  return (updateModuleRouteMap[module] || []).some(routePath => path.startsWith(routePath));
};
