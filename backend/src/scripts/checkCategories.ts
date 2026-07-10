import prisma from '../config/database';

async function checkCategories() {
  try {
    console.log('=== 分类数据统计 ===');

    const count = await prisma.ozonCategory.count();
    console.log(`分类总数: ${count}`);

    const level1 = await prisma.ozonCategory.count({ where: { level: 1 } });
    console.log(`一级分类数: ${level1}`);

    const level2 = await prisma.ozonCategory.count({ where: { level: 2 } });
    console.log(`二级分类数: ${level2}`);

    const level3 = await prisma.ozonCategory.count({ where: { level: 3 } });
    console.log(`三级分类数: ${level3}`);

    console.log('\n=== 前5个分类 ===');
    const first5 = await prisma.ozonCategory.findMany({
      take: 5,
      orderBy: { id: 'asc' }
    });
    first5.forEach(category => {
      console.log(`${category.id} - ${category.name} (level: ${category.level})`);
    });

    console.log('\n=== 随机5个分类 ===');
    const random5 = await prisma.ozonCategory.findMany({
      take: 5,
      orderBy: { id: 'desc' }
    });
    random5.forEach(category => {
      console.log(`${category.id} - ${category.name} (level: ${category.level})`);
    });
  } catch (error) {
    console.error('查询分类数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();
