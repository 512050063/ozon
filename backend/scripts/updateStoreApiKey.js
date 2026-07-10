const prisma = require('../dist/config/database').default;

async function updateStoreApiKey() {
  console.log('=== 更新店铺API Key ===\n');
  
  try {
    // 更新店铺的API Key为参考项目的API Key（店铺ID为2）
    const result = await prisma.ozonStore.update({
      where: { id: 2 },
      data: {
        apiKey: '707e13de-6e49-4704-8fc5-5049893e55c9'
      }
    });
    
    console.log(`成功更新店铺: ${result.name}`);
    console.log(`Client ID: ${result.clientId}`);
    console.log(`API Key: ${result.apiKey}`);
    
  } catch (error) {
    console.error(`更新失败: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

updateStoreApiKey().catch(console.error);