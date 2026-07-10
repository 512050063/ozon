import prisma from '../config/database';
import { hashPassword } from '../utils/password';

// 系统菜单权限配置（精确到二级菜单）
const menuPermissions = {
  // 仪表盘
  'dashboard': { path: '/dashboard', name: 'Dashboard' },
  // 产品分析
  'product-analysis': { path: '/product-analysis', name: 'ProductAnalysis' },
  // 选品采集
  'source-collection': { path: '/source-collection', name: 'SourceCollection' },
  // 价格管理
  'price-management': { path: '/price-management', name: 'PriceManagement' },
  // 仓库管理
  'warehouse': {
    path: '/warehouse',
    name: 'Warehouse',
    children: [
      { path: '/warehouse/product-library', name: 'WarehouseProductLibrary', key: 'warehouse/product-library' },
      { path: '/warehouse/image-library', name: 'WarehouseImageLibrary', key: 'warehouse/image-library' },
      { path: '/warehouse/material-library', name: 'WarehouseMaterialLibrary', key: 'warehouse/material-library' }
    ]
  },
  // Ozon平台
  'ozon': {
    path: '/ozon',
    name: 'Ozon',
    children: [
      { path: '/ozon/store-management', name: 'OzonStoreManagement', key: 'ozon/store-management' },
      { path: '/ozon/product-management', name: 'OzonProductManagement', key: 'ozon/product-management' },
      { path: '/ozon/order-management', name: 'OzonOrderManagement', key: 'ozon/order-management' },
      { path: '/ozon/promotions', name: 'OzonPromotions', key: 'ozon/promotions' },
      { path: '/ozon/finance-report', name: 'OzonFinanceReport', key: 'ozon/finance-report' },
      { path: '/ozon/pricing', name: 'OzonPricing', key: 'ozon/pricing' },
      { path: '/ozon/customer-service', name: 'OzonCustomerService', key: 'ozon/customer-service' }
    ]
  },
  // 会员管理
  'vip': { path: '/vip', name: 'VIP' },
  // 系统设置
  'settings': {
    path: '/settings',
    name: 'Settings',
    children: [
      { path: '/settings/account-info', name: 'SettingsAccountInfo', key: 'settings/account-info' },
      { path: '/settings/role-management', name: 'SettingsRoleManagement', key: 'settings/role-management' },
      { path: '/settings/user-management', name: 'SettingsUserManagement', key: 'settings/user-management' },
      { path: '/settings/api-config', name: 'SettingsApiConfig', key: 'settings/api-config' },
      { path: '/settings/payment-records', name: 'SettingsPaymentRecords', key: 'settings/payment-records' },
      { path: '/settings/image-library', name: 'SettingsImageLibrary', key: 'settings/image-library' }
    ]
  }
};

// 角色默认权限配置
const rolePermissions = {
  super_admin: {
    name: '超管',
    code: 'super_admin',
    description: '拥有系统最高权限',
    permissions: [
      'dashboard',
      'product-analysis',
      'source-collection',
      'price-management',
      'warehouse',
      'warehouse/product-library',
      'warehouse/image-library',
      'warehouse/material-library',
      'ozon',
      'ozon/store-management',
      'ozon/product-management',
      'ozon/order-management',
      'ozon/promotions',
      'ozon/finance-report',
      'ozon/pricing',
      'ozon/customer-service',
      'vip',
      'settings',
      'settings/account-info',
      'settings/role-management',
      'settings/user-management',
      'settings/api-config',
      'settings/payment-records'
    ],
    isSystem: true
  },
  admin: {
    name: '管理员',
    code: 'admin',
    description: '拥有所有权限',
    permissions: [
      'dashboard',
      'product-analysis',
      'source-collection',
      'price-management',
      'warehouse',
      'warehouse/product-library',
      'warehouse/image-library',
      'warehouse/material-library',
      'ozon',
      'ozon/store-management',
      'ozon/product-management',
      'ozon/order-management',
      'ozon/promotions',
      'ozon/finance-report',
      'ozon/pricing',
      'ozon/customer-service',
      'vip',
      'settings',
      'settings/account-info',
      'settings/role-management',
      'settings/user-management',
      'settings/api-config',
      'settings/payment-records'
    ],
    isSystem: true
  },
  operation: {
    name: '运营',
    code: 'operation',
    description: '负责平台运营',
    permissions: [
      'dashboard',
      'product-analysis',
      'source-collection',
      'price-management',
      'warehouse',
      'warehouse/product-library',
      'warehouse/image-library',
      'warehouse/material-library',
      'ozon',
      'ozon/store-management',
      'ozon/product-management',
      'ozon/order-management',
      'ozon/promotions',
      'ozon/finance-report',
      'ozon/pricing',
      'ozon/customer-service',
      'vip',
      'settings/account-info'
    ],
    isSystem: false
  },
  customer_service: {
    name: '客服',
    code: 'customer_service',
    description: '处理用户咨询',
    permissions: [
      'dashboard',
      'ozon/customer-service',
      'settings/account-info'
    ],
    isSystem: false
  },
  seller: {
    name: '普通用户',
    code: 'seller',
    description: '一般用户',
    permissions: [
      'dashboard',
      'product-analysis',
      'source-collection',
      'price-management',
      'warehouse',
      'warehouse/product-library',
      'warehouse/material-library',
      'ozon',
      'ozon/store-management',
      'ozon/product-management',
      'ozon/order-management',
      'ozon/promotions',
      'ozon/finance-report',
      'ozon/pricing',
      'vip',
      'settings/account-info',
      'settings/image-library'
    ],
    isSystem: false
  }
};

// 初始化角色数据
const initRoles = async () => {
  console.log('Initializing roles...');

  for (const [roleCode, roleData] of Object.entries(rolePermissions)) {
    const existingRole = await prisma.role.findFirst({
      where: { code: roleCode },
    });

    if (!existingRole) {
      await prisma.role.create({
        data: {
          name: roleData.name,
          code: roleCode,
          description: roleData.description,
          permissions: roleData.permissions,
          isSystem: roleData.isSystem
        },
      });
      console.log(`Created role: ${roleData.name}`);
    } else {
      // 更新现有角色的权限配置
      await prisma.role.update({
        where: { code: roleCode },
        data: {
          permissions: roleData.permissions,
          isSystem: roleData.isSystem,
          ...(existingRole.description === null ? { description: roleData.description } : {}),
        },
      });
      console.log(`Updated role: ${roleData.name}`);
    }
  }
};

// 初始化admin用户
const initAdminUser = async () => {
  const adminUsername = 'admin';
  const adminPassword = 'admin123'; // 建议在生产环境中使用更复杂的密码

  const existingUser = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingUser) {
    const adminRole = await prisma.role.findFirst({
      where: { code: 'super_admin' },
    });

    if (adminRole) {
      const hashedPassword = await hashPassword(adminPassword);
      const user = await prisma.user.create({
        data: {
          username: adminUsername,
          password: hashedPassword,
          roleId: adminRole.id,
          status: 'active',
          memberLevel: 'professional',
          nickname: '系统管理员',
        },
      });
      console.log(`Created admin user: ${user.username}`);
    } else {
      console.error('Super admin role not found. Please initialize roles first.');
    }
  } else {
    const superAdminRole = await prisma.role.findFirst({
      where: { code: 'super_admin' },
    });
    if (superAdminRole && existingUser.roleId !== superAdminRole.id) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { roleId: superAdminRole.id },
      });
      console.log('Updated admin user role to super_admin');
    } else {
      console.log('Admin user already exists');
    }
  }
};

// 执行初始化
const initDatabase = async () => {
  try {
    console.log('Initializing database...');
    await initRoles();
    await initAdminUser();
    console.log('Database initialization completed.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await prisma.$disconnect();
  }
};

initDatabase();
