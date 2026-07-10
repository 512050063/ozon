import prisma from '../config/database';

async function clearCategories() {
  try {
    console.log('使用原始 SQL 清空表，跳过外键约束...');

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE ozon_categories');
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    const count = await prisma.ozonCategory.count();
    console.log('清空后的分类数量:', count);
  } catch (error) {
    console.error('清空分类失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearCategories();
