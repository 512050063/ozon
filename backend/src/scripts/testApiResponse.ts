import { ozonApiRequest } from '../services/ozonCategoryService';

async function testApiResponse() {
  try {
    // 使用用户提供的真实 API 凭证
    const clientId = '4530486';
    const apiKey = 'b2bce1c4-cfd1-420c-9acd-acdaaa51fdfe';

    console.log('测试 Ozon API 响应...');

    // 调用 Ozon 分类 API
    const apiData = await ozonApiRequest(
      'https://api-seller.ozon.ru/v1/description-category/tree',
      clientId,
      apiKey,
      'POST',
      { language: 'ZH_HANS' }
    );

    console.log('API 响应数据结构:', JSON.stringify(apiData, null, 2));

    if (apiData.result) {
      console.log(`一级分类数量: ${apiData.result.length}`);

      // 检查前 3 个一级分类的子分类
      apiData.result.slice(0, 3).forEach((category: any, index: number) => {
        console.log(`\n第 ${index + 1} 个一级分类 "${category.category_name}":`);
        if (category.children) {
          console.log(`  二级分类数量: ${category.children.length}`);

          // 检查前 3 个二级分类的子分类
          category.children.slice(0, 3).forEach((childCategory: any, childIndex: number) => {
            console.log(`    第 ${childIndex + 1} 个二级分类 "${childCategory.category_name}":`);
            if (childCategory.children) {
              console.log(`      三级分类数量: ${childCategory.children.length}`);

              // 打印三级分类列表
              if (childCategory.children.length > 0) {
                console.log(`      三级分类列表:`);
                childCategory.children.forEach((grandChild: any) => {
                  console.log(`        - ${grandChild.category_name}`);
                });
              }
            } else {
              console.log(`      三级分类数量: 0`);
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('API 测试失败:', error);
  }
}

testApiResponse();
