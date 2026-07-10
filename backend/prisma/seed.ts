import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 定义所有权限菜单
  const allPermissions = [
    'dashboard',
    'product-analysis',
    'source-collection',
    'warehouse',
    'warehouse/product-library',
    'warehouse/material-library',
    'ozon/store-management',
    'ozon/order-management',
    'ozon/product-management',
    'ozon/finance-report',
    'ozon/pricing',
    'ozon/customer-service',
    'ozon/customer-service/auto-reply',
    'ozon/customer-service/messages',
    'settings',
    'settings/account-info',
    'vip',
    'settings/role-management',
    'settings/user-management',
    'settings/payment-records',
    'settings/api-config'
  ];

  // 初始化角色数据
  const roles = [
    { code: 'admin', permissions: allPermissions, isSystem: true },
    { code: 'operation', permissions: ['dashboard', 'product-analysis', 'source-collection', 'warehouse', 'warehouse/product-library', 'warehouse/material-library', 'ozon/store-management', 'ozon/order-management', 'ozon/product-management', 'ozon/finance-report', 'ozon/pricing', 'ozon/customer-service', 'ozon/customer-service/auto-reply', 'ozon/customer-service/messages', 'settings', 'settings/account-info', 'vip'], isSystem: true },
    { code: 'customer_service', permissions: ['dashboard', 'ozon/customer-service', 'ozon/customer-service/auto-reply', 'ozon/customer-service/messages', 'settings', 'settings/account-info'], isSystem: true },
    { code: 'seller', permissions: ['dashboard', 'product-analysis', 'source-collection', 'warehouse', 'warehouse/product-library', 'warehouse/material-library', 'ozon/store-management', 'ozon/order-management', 'ozon/product-management', 'ozon/finance-report', 'ozon/pricing', 'settings', 'settings/account-info', 'vip'], isSystem: true },
  ];

  for (const role of roles) {
    // 如果角色不存在则创建，存在则更新
    const existingRole = await prisma.role.findUnique({
      where: { code: role.code },
    });

    if (existingRole) {
      await prisma.role.update({
        where: { code: role.code },
        data: {
          permissions: role.permissions,
          isSystem: role.isSystem,
        },
      });
      console.log(`✅ 更新角色权限: ${role.code}`);
    } else {
      await prisma.role.create({
        data: {
          code: role.code,
          name: role.code === 'admin' ? '管理员' : 
                role.code === 'operation' ? '运营人员' : 
                role.code === 'customer_service' ? '客服人员' : '卖家',
          description: role.code === 'admin' ? '系统管理员' : 
                       role.code === 'operation' ? '运营管理人员' : 
                       role.code === 'customer_service' ? '客户服务人员' : '普通卖家用户',
          permissions: role.permissions,
          isSystem: role.isSystem,
        },
      });
      console.log(`✅ 创建角色: ${role.code}`);
    }
  }

  console.log('✅ 创建角色数据');

  // 获取管理员角色
  const adminRole = await prisma.role.findFirst({
    where: { code: 'admin' },
  });

  // 创建默认管理员用户
  if (adminRole) {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: adminPassword,
        roleId: adminRole.id,
        status: 'active',
        memberLevel: 'professional',
        nickname: '系统管理员',
      },
    });

    console.log('✅ 创建管理员用户:', admin.username);
  }

  // 获取普通用户角色
  const sellerRole = await prisma.role.findFirst({
    where: { code: 'seller' },
  });

  // 创建测试卖家用户
  if (sellerRole) {
    const sellerPassword = await bcrypt.hash('seller123', 10);
    const seller = await prisma.user.upsert({
      where: { username: 'test_seller' },
      update: {},
      create: {
        username: 'test_seller',
        password: sellerPassword,
        roleId: sellerRole.id,
        status: 'active',
        memberLevel: 'free',
        nickname: '测试卖家',
      },
    });

    console.log('✅ 创建测试卖家用户:', seller.username);

    // 创建一些示例产品数据
    const exampleProducts = [
      {
        userId: seller.id,
        titleOriginal: '智能手表',
        titleTranslated: 'Smart Watch',
        price: 199.99,
        rating: 4.5,
        salesCount: 1250,
        category: 'Electronics',
        specifications: {
          screen: '1.5 inch',
          battery: '400mAh',
          waterResistant: '5ATM',
        },
        images: ['image1.jpg', 'image2.jpg', 'image3.jpg'],
      },
      {
        userId: seller.id,
        titleOriginal: '无线耳机',
        titleTranslated: 'Wireless Earbuds',
        price: 89.99,
        rating: 4.8,
        salesCount: 3500,
        category: 'Electronics',
        specifications: {
          type: 'TWS',
          battery: '60mAh each',
          caseBattery: '400mAh',
        },
        images: ['earbuds1.jpg', 'earbuds2.jpg'],
      },
    ];

    for (let i = 0; i < exampleProducts.length; i++) {
      await prisma.product.upsert({
        where: {
          id: i + 1,
        },
        update: {},
        create: exampleProducts[i],
      });
    }

    console.log('✅ 创建示例产品数据');
  }

  console.log('🎉 数据库初始化完成!');
  console.log('');
  console.log('📝 登录信息:');
  console.log('   管理员: admin / admin123');
  console.log('   测试卖家: test_seller / seller123');
}

main()
  .catch((e) => {
    console.error('数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
