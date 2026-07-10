import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/store/authStore';
import ErrorPage from '@/views/pages/error/ErrorPage.vue';

const routes = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('@/views/pages/Login.vue'),
    meta: { requiresAuth: false, guestOnly: true },
  },
  {
    path: '/install',
    name: 'Install',
    component: () => import('@/views/install/Index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/dashboard/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'dashboard' },
  },
  {
    path: '/product-analysis/ozon-preference',
    name: 'OzonPreference',
    component: () => import('@/views/product-analysis/ozon-preference/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'product-analysis' },
  },
  {
    path: '/source-collection',
    name: 'SourceCollection',
    redirect: '/source-collection/product-collection',
    meta: { requiresAuth: true, menuKey: 'source-collection' },
  },
  {
    path: '/source-collection/product-collection',
    name: 'SourceCollectionProductCollection',
    component: () => import('@/views/source-collection/product-collection/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'source-collection/product-collection' },
  },
  {
    path: '/source-collection/supply-management',
    name: 'SourceCollectionSupplyManagement',
    component: () => import('@/views/source-collection/supply-management/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'source-collection/supply-management' },
  },
  {
    path: '/warehouse/product-library',
    name: 'WarehouseProductLibrary',
    component: () => import('@/views/warehouse/product-library/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'warehouse/product-library' },
  },
  {
    path: '/warehouse/material-library',
    name: 'WarehouseMaterialLibrary',
    component: () => import('@/views/warehouse/material-library/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'warehouse/material-library' },
  },
  {
    path: '/product-analysis/bidding-monitor',
    name: 'BiddingMonitor',
    component: () => import('@/views/product-analysis/bidding-monitor/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'price-management' },
  },

  {
    path: '/ozon/store-management',
    name: 'OzonStoreManagement',
    component: () => import('@/views/ozon/store-management/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/store-management' },
  },
  {
    path: '/ozon/product-management',
    name: 'OzonProductManagement',
    component: () => import('@/views/ozon/product-management/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/product-management' },
  },
  {
    path: '/ozon/order-management',
    name: 'OzonOrderManagement',
    component: () => import('@/views/ozon/order-management/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/order-management' },
  },
  {
    path: '/ozon/promotions',
    name: 'OzonPromotions',
    component: () => import('@/views/ozon/promotions/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/promotions' },
  },
  {
    path: '/ozon/promotions/:actionId',
    name: 'OzonPromotionProducts',
    component: () => import('@/views/ozon/promotions/products/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/promotions' },
  },
  {
    path: '/ozon/promotions/:actionId/add',
    name: 'OzonPromotionAddProducts',
    component: () => import('@/views/ozon/promotions/add-products/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/promotions' },
  },
  {
    path: '/ozon/finance-report',
    name: 'OzonFinanceReport',
    component: () => import('@/views/ozon/finance-report/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/finance-report' },
  },
  {
    path: '/ozon/pricing',
    name: 'OzonPricing',
    component: () => import('@/views/ozon/pricing-strategy/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/pricing' },
  },
  {
    path: '/customer-service',
    name: 'OzonCustomerService',
    component: () => import('@/views/customer-service/auto-reply/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/customer-service/auto-reply' },
  },
  {
    path: '/customer-service/messages',
    name: 'OzonMessageCenter',
    component: () => import('@/views/customer-service/message-center/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'ozon/customer-service/messages' },
  },
  {
    path: '/settings',
    name: 'Settings',
    redirect: '/settings/account-info',
    meta: { requiresAuth: true, menuKey: 'settings' },
  },
  {
    path: '/settings/account-info',
    name: 'SettingsAccountInfo',
    component: () => import('@/views/settings/account-info/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'settings/account-info' },
  },
  {
    path: '/settings/role-management',
    name: 'SettingsRoleManagement',
    component: () => import('@/views/settings/role-management/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'settings/role-management', requiresAdmin: true },
  },
  {
    path: '/vip',
    name: 'VIP',
    component: () => import('@/views/pages/VIP.vue'),
    meta: { requiresAuth: true, menuKey: 'vip' },
  },
  {
    path: '/settings/api-config',
    name: 'SettingsApiConfig',
    component: () => import('@/views/settings/api-config/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'settings/api-config', requiresAdmin: true },
  },
  {
    path: '/settings/user-management',
    name: 'SettingsUserManagement',
    component: () => import('@/views/settings/user-management/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'settings/user-management', requiresAdmin: true },
  },
  {
    path: '/settings/payment-records',
    name: 'SettingsPaymentRecords',
    component: () => import('@/views/settings/payment-records/Index.vue'),
    meta: { requiresAuth: true, menuKey: 'settings/payment-records', requiresAdmin: true },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: ErrorPage,
    props: { code: '404' },
  },
  {
    path: '/500',
    name: 'ServerError',
    component: ErrorPage,
    props: { code: '500' },
  },
  {
    path: '/502',
    name: 'ModuleLoadError',
    component: ErrorPage,
    props: { code: '502' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
];

const router = createRouter({
  history: createWebHistory((import.meta as any).env.BASE_URL),
  routes,
});

// 路由守卫
let isAuthInitialized = false;
const MODULE_RELOAD_KEY_PREFIX = 'ozon:module-reload:';

const getBrowserPath = () => {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';
};

const getModuleLoadTargetPath = () => {
  const routePath = router.currentRoute.value.fullPath;
  if (routePath && routePath !== '/') return routePath;
  return getBrowserPath();
};

const reloadModuleTargetOnce = (targetPath: string) => {
  if (typeof window === 'undefined') return false;

  const storageKey = `${MODULE_RELOAD_KEY_PREFIX}${targetPath}`;
  if (window.sessionStorage.getItem(storageKey)) {
    return false;
  }

  window.sessionStorage.setItem(storageKey, '1');
  const browserPath = getBrowserPath();
  if (browserPath === targetPath) {
    window.location.reload();
  } else {
    window.location.assign(targetPath);
  }
  return true;
};

router.onError((error) => {
  const message = String((error as Error)?.message || error || '');
  if (message.includes('Failed to fetch dynamically imported module')) {
    const currentPath = getModuleLoadTargetPath();
    if (currentPath !== '/502') {
      if (reloadModuleTargetOnce(currentPath)) return;
      router.replace({
        path: '/502',
        query: { target: currentPath },
      });
    }
  }
});

router.afterEach((to) => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(`${MODULE_RELOAD_KEY_PREFIX}${to.fullPath}`);
  }
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // 确保认证状态已初始化（只在首次路由跳转时执行）
  if (!isAuthInitialized) {
    try {
      await authStore.restoreAuth();
    } catch {
    } finally {
      isAuthInitialized = true;
    }
  }

  // 检查是否需要验证
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/auth');
    return;
  }

  // 检查是否是访客页面
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    next('/dashboard');
    return;
  }

  // 菜单权限控制：只用 permissions 数组判断
  if (authStore.isAuthenticated && to.meta.menuKey && authStore.user?.role?.permissions) {
    // 检查用户权限是否包含该菜单
    const menuKey = to.meta.menuKey as string;
    const permissions = authStore.user.role.permissions;
    const hasLegacyOzonOrderAccess =
      menuKey === 'ozon/order-management' &&
      (permissions.includes('ozon/order-management') ||
        permissions.includes('ozon/product-management') ||
        permissions.includes('ozon/pricing'));
    const hasLegacyFinanceAccess =
      menuKey === 'ozon/finance-report' &&
      (permissions.includes('ozon/finance-report') ||
        permissions.includes('ozon/order-management'));
    const hasLegacyCustomerServiceAccess =
      menuKey.startsWith('ozon/customer-service/') && permissions.includes('ozon/customer-service');
    const hasLegacySourceCollectionAccess =
      menuKey.startsWith('source-collection/') && permissions.includes('source-collection');

    if (
      !permissions.includes(menuKey) &&
      !hasLegacyOzonOrderAccess &&
      !hasLegacyCustomerServiceAccess &&
      !hasLegacyFinanceAccess &&
      !hasLegacySourceCollectionAccess
    ) {
      // 如果用户无权限，跳到错误页
      next('/404');
      return;
    }
  }

  next();
});

export default router;
