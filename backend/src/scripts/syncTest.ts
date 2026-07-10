import { syncProductsToDatabase } from '../services/ozonProductService';

async function syncTest() {
  try {
    console.log('=== 开始同步产品数据测试 ===');

    // 同步产品数据
    const result = await syncProductsToDatabase(3);

    console.log('同步结果:', result);

    console.log('=== 同步测试完成 ===');
  } catch (error) {
    console.error('同步测试失败:', error);
  }
}

syncTest();
