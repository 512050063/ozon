import { ozonApiRequest } from '../services/ozonCategoryService';

async function debugApiResponse() {
  try {
    const clientId = '4530486';
    const apiKey = 'b2bce1c4-cfd1-420c-9acd-acdaaa51fdfe';
    console.log('开始调试 API 响应...');

    // 直接发送请求，不使用 ozonApiRequest 的解析方法
    const response = await fetch('https://api-seller.ozon.ru/v1/description-category/tree', {
      method: 'POST',
      headers: {
        'Client-Id': clientId,
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language: 'ZH_HANS' }),
    });

    if (!response.ok) {
      throw new Error(`Ozon API request failed: ${response.status}`);
    }

    const text = await response.text();
    console.log(`响应长度: ${text.length}`);

    // 检查错误位置附近的内容
    const errorPosition = 459091;
    const start = Math.max(0, errorPosition - 100);
    const end = Math.min(text.length, errorPosition + 100);
    console.log(`位置 ${errorPosition} 附近的内容:`);
    console.log(text.slice(start, end));

    // 查找所有可能的控制字符
    const controlChars = [];
    for (let i = start; i < end; i++) {
      const charCode = text.charCodeAt(i);
      if (charCode < 32 || (charCode >= 127 && charCode <= 159)) {
        controlChars.push(`位置 ${i}: 0x${charCode.toString(16).padStart(2, '0')} "${text[i]}"`);
      }
    }
    console.log(`找到的控制字符:`);
    console.log(controlChars);
  } catch (error) {
    console.error('调试失败:', error);
  }
}

debugApiResponse();
