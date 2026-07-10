import { ozonApiRequest } from '../services/ozonCategoryService';

async function checkApiResponseStructure() {
  try {
    console.log('检查 API 响应结构...');

    // 直接使用 API 函数
    const clientId = '4530486';
    const apiKey = 'b2bce1c4-cfd1-420c-9acd-acdaaa51fdfe';
    const response = await ozonApiRequest(
      'https://api-seller.ozon.ru/v1/description-category/tree',
      clientId,
      apiKey,
      'POST',
      { language: 'ZH_HANS' }
    );

    console.log('API 响应结构:', JSON.stringify(response, null, 2));

    if (response.result) {
      console.log('是否包含 result 属性: 是');

      // 统计分类数量
      let level1 = 0;
      let level2 = 0;
      let level3 = 0;

      response.result.forEach((category: any) => {
        level1++;

        if (category.children) {
          category.children.forEach((subCategory: any) => {
            level2++;

            if (subCategory.children) {
              subCategory.children.forEach((type: any) => {
                level3++;
              });
            }
          });
        }
      });

      console.log(`分类数量统计:`);
      console.log(`  一级分类: ${level1}个`);
      console.log(`  二级分类: ${level2}个`);
      console.log(`  三级分类: ${level3}个`);

      if (level3 > 0) {
        console.log('✅ API 响应包含三级分类');
      } else {
        console.log('❌ API 响应不包含三级分类');
      }

      // 检查是否有包含三级子分类的分类
      let hasThreeLevel = false;

      response.result.forEach((category: any) => {
        if (category.children) {
          category.children.forEach((subCategory: any) => {
            if (subCategory.children && subCategory.children.length > 0) {
              console.log(`✅ 分类 "${category.category_name}" > "${subCategory.category_name}" 包含三级子分类`);
              hasThreeLevel = true;
            }
          });
        }
      });

      if (!hasThreeLevel) {
        console.log('❌ 没有找到包含三级子分类的分类');
      }
    } else {
      console.log('❌ API 响应不包含 result 属性');
    }
  } catch (error) {
    console.error('检查失败:', error);
  }
}

checkApiResponseStructure();
