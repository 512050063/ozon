const prisma = require('../dist/config/database').default;

async function getArchiveProductsFromApi() {
  console.log('=== 从API获取归档商品详细信息 ===\n');
  
  const stores = await prisma.ozonStore.findMany();
  
  for (const store of stores) {
    console.log(`店铺: ${store.name} (ID: ${store.id})`);
    
    const OZON_PRODUCT_LIST_API = 'https://api-seller.ozon.ru/v3/product/list';
    const OZON_PRODUCT_INFO_API = 'https://api-seller.ozon.ru/v3/product/info/list';
    
    async function ozonApiRequest(url, clientId, apiKey, method = 'GET', data) {
      const response = await fetch(url, {
        method,
        headers: {
          'Client-Id': clientId,
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!response.ok) {
        throw new Error(`Ozon API request failed: ${response.status}`);
      }
      return await response.json();
    }
    
    // 获取归档商品ID
    console.log('\n获取归档商品ID...');
    let lastId = "";
    let hasMore = true;
    let archiveProductIds = [];
    
    while (hasMore) {
      const apiData = await ozonApiRequest(
        OZON_PRODUCT_LIST_API,
        store.clientId,
        store.apiKey,
        'POST',
        {
          last_id: lastId,
          limit: 1000,
          filter: {
            visibility: 'ARCHIVED',
          },
        }
      );
      
      if (apiData && apiData.result && apiData.result.items) {
        const items = apiData.result.items;
        archiveProductIds.push(...items.map(item => item.product_id.toString()));
        
        hasMore = items.length === 1000 && items.length > 0;
        if (items.length > 0) {
          lastId = items[items.length - 1].product_id.toString();
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log(`获取到 ${archiveProductIds.length} 个归档商品ID`);
    
    // 批量获取归档商品详情
    console.log('\n获取归档商品详情...');
    const batchSize = 100;
    let archiveProducts = [];
    
    for (let i = 0; i < archiveProductIds.length; i += batchSize) {
      const batchIds = archiveProductIds.slice(i, i + batchSize);
      const apiData = await ozonApiRequest(
        OZON_PRODUCT_INFO_API,
        store.clientId,
        store.apiKey,
        'POST',
        {
          product_id: batchIds,
          limit: batchIds.length,
          offset: 0,
        }
      );
      
      if (apiData && apiData.result && Array.isArray(apiData.result.items)) {
        archiveProducts.push(...apiData.result.items);
      }
    }
    
    console.log(`获取到 ${archiveProducts.length} 个归档商品详情`);
    
    // 统计归档标记
    let hasArchiveFlag = 0;
    let hasAutoArchiveFlag = 0;
    let hasEither = 0;
    let hasNeither = 0;
    let visibilityArchived = 0;
    
    const noFlagProducts = [];
    
    for (const product of archiveProducts) {
      const isArchived = product.is_archived === true || product.is_archived === 'true';
      const isAutoArchived = product.is_autoarchived === true || product.is_autoarchived === 'true';
      const visibility = product.visibility;
      
      if (isArchived) hasArchiveFlag++;
      if (isAutoArchived) hasAutoArchiveFlag++;
      if (isArchived || isAutoArchived) {
        hasEither++;
      } else {
        hasNeither++;
        noFlagProducts.push({
          productId: product.product_id,
          name: product.name,
          visibility: visibility,
          is_archived: product.is_archived,
          is_autoarchived: product.is_autoarchived
        });
      }
      
      if (visibility === 'ARCHIVED') visibilityArchived++;
    }
    
    console.log('\n归档商品标记统计:');
    console.log(`  - 总数: ${archiveProducts.length}`);
    console.log(`  - is_archived=true: ${hasArchiveFlag}`);
    console.log(`  - is_autoarchived=true: ${hasAutoArchiveFlag}`);
    console.log(`  - 任一归档标记=true: ${hasEither}`);
    console.log(`  - 无归档标记: ${hasNeither}`);
    console.log(`  - visibility=ARCHIVED: ${visibilityArchived}`);
    
    if (hasNeither > 0) {
      console.log('\n无归档标记的归档商品:');
      for (const p of noFlagProducts) {
        console.log(`  - 商品ID: ${p.productId}, visibility: "${p.visibility}", is_archived: ${p.is_archived}, is_autoarchived: ${p.is_autoarchived}`);
      }
    }
  }
  
  await prisma.$disconnect();
}

getArchiveProductsFromApi().catch(console.error);