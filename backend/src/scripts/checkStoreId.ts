import prisma from '../config/database';

async function checkStoreId() {
  try {
    console.log('=== 检查店铺ID ===\n');

    const stores = await prisma.ozonStore.findMany({
      select: {
        id: true,
        name: true,
        storeId: true
      }
    });

    console.log(`找到 ${stores.length} 个店铺:\n`);

    for (const store of stores) {
      console.log(`ID: ${store.id}, 名称: ${store.name}, Ozon店铺ID: ${store.storeId}`);
    }

    console.log('\n=== 检查完成 ===');
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStoreId();
