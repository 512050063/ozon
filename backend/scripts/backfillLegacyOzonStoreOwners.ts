import prisma from '../src/config/database';

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: { username: 'admin' },
    select: { id: true, username: true },
  });

  if (!adminUser) {
    throw new Error('未找到 admin 用户，无法回填历史店铺归属');
  }

  const legacyStores = await prisma.ozonStore.findMany({
    where: { userId: null },
    select: { id: true, name: true, storeId: true },
    orderBy: { createdAt: 'asc' },
  });

  if (legacyStores.length === 0) {
    console.log('没有需要回填的历史 Ozon 店铺');
    return;
  }

  const result = await prisma.ozonStore.updateMany({
    where: { userId: null },
    data: { userId: adminUser.id },
  });

  console.log(
    JSON.stringify(
      {
        assignedUserId: adminUser.id,
        assignedUsername: adminUser.username,
        updatedCount: result.count,
        stores: legacyStores,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
