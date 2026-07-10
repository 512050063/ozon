const prisma = require('../dist/config/database').default;

async function getStores() {
  const stores = await prisma.ozonStore.findMany();
  console.log('=== Ozon店铺列表 ===');
  console.log(JSON.stringify(stores, null, 2));
  await prisma.$disconnect();
}

getStores().catch(console.error);