import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { InstallAdminInput, ProductionSeedInput, SYSTEM_PERMISSIONS } from './installTypes';

export const SYSTEM_ROLES = [
  {
    code: 'super_admin',
    name: '超管',
    description: '系统超级管理员',
    permissions: [...SYSTEM_PERMISSIONS],
    isSystem: true,
  },
  {
    code: 'admin',
    name: '管理员',
    description: '系统管理员',
    permissions: [...SYSTEM_PERMISSIONS],
    isSystem: true,
  },
  {
    code: 'operation',
    name: '运营人员',
    description: '运营管理人员',
    permissions: [
      'dashboard',
      'product-analysis',
      'price-management',
      'source-collection',
      'source-collection/product-collection',
      'source-collection/supply-management',
      'warehouse',
      'warehouse/product-library',
      'warehouse/material-library',
      'ozon/store-management',
      'ozon/order-management',
      'ozon/product-management',
      'ozon/promotions',
      'ozon/finance-report',
      'ozon/pricing',
      'ozon/customer-service',
      'ozon/customer-service/auto-reply',
      'ozon/customer-service/messages',
      'settings',
      'settings/account-info',
      'vip',
    ],
    isSystem: true,
  },
  {
    code: 'customer_service',
    name: '客服人员',
    description: '客户服务人员',
    permissions: [
      'dashboard',
      'ozon/customer-service',
      'ozon/customer-service/auto-reply',
      'ozon/customer-service/messages',
      'settings',
      'settings/account-info',
    ],
    isSystem: true,
  },
  {
    code: 'seller',
    name: '卖家',
    description: '普通卖家用户',
    permissions: [
      'dashboard',
      'product-analysis',
      'price-management',
      'source-collection',
      'source-collection/product-collection',
      'source-collection/supply-management',
      'warehouse',
      'warehouse/product-library',
      'warehouse/material-library',
      'ozon/store-management',
      'ozon/order-management',
      'ozon/product-management',
      'ozon/promotions',
      'ozon/finance-report',
      'ozon/pricing',
      'settings',
      'settings/account-info',
      'vip',
    ],
    isSystem: true,
  },
];

type PrismaLike = typeof prisma;

export async function ensureSystemRoles(prismaClient: PrismaLike = prisma) {
  const roles = [];
  for (const role of SYSTEM_ROLES) {
    const saved = await prismaClient.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
      },
      create: role,
    });
    roles.push(saved);
  }
  return roles;
}

export async function ensureOzonConfig(prismaClient: PrismaLike = prisma) {
  return prismaClient.ozonConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      searchLimit: 50,
      cacheMaxAge: 2,
    },
  });
}

export async function ensureAdminUser(input: InstallAdminInput, prismaClient: PrismaLike = prisma) {
  const username = input.username.trim();
  if (!username) throw new Error('管理员用户名不能为空');
  if (!input.password || input.password.length < 8) throw new Error('管理员密码至少 8 位');

  const adminRole = await prismaClient.role.findUnique({ where: { code: 'super_admin' } });
  if (!adminRole) throw new Error('超管角色不存在，请先初始化系统角色');

  const password = await bcrypt.hash(input.password, 10);
  return prismaClient.user.upsert({
    where: { username },
    update: {
      password,
      roleId: adminRole.id,
      status: 'active',
      nickname: input.nickname?.trim() || '系统管理员',
    },
    create: {
      username,
      password,
      roleId: adminRole.id,
      status: 'active',
      memberLevel: 'professional',
      nickname: input.nickname?.trim() || '系统管理员',
    },
  });
}

export async function runProductionSeed(input: ProductionSeedInput, prismaClient: PrismaLike = prisma) {
  const roles = await ensureSystemRoles(prismaClient);
  const config = await ensureOzonConfig(prismaClient);
  const admin = await ensureAdminUser(input.admin, prismaClient);
  return {
    roles: roles.length,
    configId: config.id,
    adminId: admin.id,
  };
}
