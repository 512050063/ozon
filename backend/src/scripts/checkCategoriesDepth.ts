import prisma from '../config/database';

async function checkCategoriesDepth() {
  // 查询分类统计
  const totalCount = await prisma.ozonCategory.count();
  const level1Count = await prisma.ozonCategory.count({ where: { level: 1 } });
  const level2Count = await prisma.ozonCategory.count({ where: { level: 2 } });
  const level3Count = await prisma.ozonCategory.count({ where: { level: 3 } });

  console.log(`总分类数: ${totalCount}`);
  console.log(`一级分类数: ${level1Count}`);
  console.log(`二级分类数: ${level2Count}`);
  console.log(`三级分类数: ${level3Count}`);

  // 查询一个一级分类的子分类
  const firstLevel1 = await prisma.ozonCategory.findFirst({ where: { level: 1 } });
  if (firstLevel1) {
    console.log(`\n第一个一级分类: ${firstLevel1.name} (ID: ${firstLevel1.id})`);

    const level2Children = await prisma.ozonCategory.findMany({
      where: { level: 2, parentId: firstLevel1.id }
    });

    console.log(`  二级子分类数: ${level2Children.length}`);

    if (level2Children.length > 0) {
      console.log(`  第一个二级分类: ${level2Children[0].name} (ID: ${level2Children[0].id})`);

      const level3Children = await prisma.ozonCategory.findMany({
        where: { level: 3, parentId: level2Children[0].id }
      });

      console.log(`    三级子分类数: ${level3Children.length}`);

      if (level3Children.length > 0) {
        console.log(`    前3个三级分类:`);
        level3Children.slice(0, 3).forEach(child => {
          console.log(`      - ${child.name} (ID: ${child.id})`);
        });
      } else {
        console.log(`    无三级子分类`);
      }
    }
  }
}

checkCategoriesDepth().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
