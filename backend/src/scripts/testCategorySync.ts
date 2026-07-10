import { syncOzonCategories } from '../services/ozonCategoryService';
import prisma from '../config/database';

async function testSyncCategories() {
  try {
    console.log('开始测试 Ozon 分类同步...');

    // 使用用户提供的真实 API 凭证
    const clientId = '4530486';
    const apiKey = 'b2bce1c4-cfd1-420c-9acd-acdaaa51fdfe';

    if (!clientId || !apiKey) {
      console.error('请配置正确的 Ozon API 凭证');
      return;
    }

    // 测试同步
    const result = await syncOzonCategories(clientId, apiKey);

    console.log('同步结果:', result);

    // 验证数据是否保存到数据库
    const categoryCount = await prisma.ozonCategory.count();
    console.log('数据库中的分类数量:', categoryCount);

    // 获取一级分类数量
    const level1Count = await prisma.ozonCategory.count({
      where: { level: 1 },
    });
    console.log('一级分类数量:', level1Count);

    // 获取二级分类数量
    const level2Count = await prisma.ozonCategory.count({
      where: { level: 2 },
    });
    console.log('二级分类数量:', level2Count);

    // 获取三级分类数量
    const level3Count = await prisma.ozonCategory.count({
      where: { level: 3 },
    });
    console.log('三级分类数量:', level3Count);

    // 打印前几个分类
    const topCategories = await prisma.ozonCategory.findMany({
      take: 10,
      orderBy: { id: 'asc' },
    });
    console.log('前几个分类:', topCategories);
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSyncCategories();
