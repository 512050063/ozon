import assert from "node:assert/strict";
import {
  extractOzonProductSku,
  isOzonProductUrl,
  mapOzonProductLinkRawItem,
  parseOzonMoney,
  resolveOzonProductLink,
} from "../services/ozonProductLinkService";
import { validateOzonCookieDataAvailability } from "../services/ozonCookieService";

async function main() {
  assert.equal(isOzonProductUrl("https://www.ozon.ru/product/test-123456789/"), true);
  assert.equal(isOzonProductUrl("https://ozon.ru/product/123456789/?at=test"), true);
  assert.equal(isOzonProductUrl("https://example.com/product/123456789/"), false);
  assert.equal(isOzonProductUrl("not-url"), false);

  assert.equal(extractOzonProductSku("https://www.ozon.ru/product/test-123456789/"), "123456789");
  assert.equal(extractOzonProductSku("https://www.ozon.ru/product/123456789/?at=abc"), "123456789");

  assert.equal(parseOzonMoney("¥1 234,56"), 1234.56);
  assert.equal(parseOzonMoney("1,234.56 ₽"), 1234.56);
  assert.equal(parseOzonMoney(""), 0);

  assert.deepEqual(
    validateOzonCookieDataAvailability({
      cookies: [
        { name: "abt_data", domain: ".ozon.ru", value: "test" },
        { name: "__Secure-user-id", domain: ".ozon.ru", value: "1" },
      ],
      local_storage: {
        language: "zh_Hans",
        currency: "CNY",
      },
    }),
    {
      valid: true,
      message: "Cookie可用 (2条Ozon Cookie, 2条localStorage)",
    },
  );

  assert.deepEqual(
    mapOzonProductLinkRawItem({
      sku: "123456789",
      link: "https://www.ozon.ru/product/test-123456789/",
      main_image: "https://img.test/main.jpg",
      title: "测试商品",
      price: "¥99.50",
      original_price: "¥199.00",
      discount: "-50%",
      rating: "4.9",
      review_count: "1 234",
      stock: "12",
    }),
    {
      id: "123456789",
      name: "测试商品",
      price: 99.5,
      originalPrice: 199,
      discount: 50,
      rating: 4.9,
      reviewCount: 1234,
      imageUrl: "https://img.test/main.jpg",
      productUrl: "https://www.ozon.ru/product/test-123456789/",
      stock: 12,
      productType: "",
      descriptionCategoryId: null,
      typeId: null,
    },
  );

  {
    const calls: Array<{ name: string; value: unknown }> = [];
    const result = await resolveOzonProductLink(
      {
        validateCookie: async () => {
          calls.push({ name: "validateCookie", value: null });
          return { valid: true, message: "Cookie有效" };
        },
        fetchProduct: async (url: string) => {
          calls.push({ name: "fetchProduct", value: url });
          return {
            sku: "123456789",
            link: url,
            main_image: "https://img.test/main.jpg",
            title: "测试商品",
            price: "¥99.50",
            original_price: "",
            discount: "",
            rating: "4.8",
            review_count: "321",
            stock: "",
          };
        },
        extractType: async (url: string) => {
          calls.push({ name: "extractType", value: url });
          return { type: "耳机", source: "script" };
        },
      },
      "https://www.ozon.ru/product/test-123456789/",
    );

    assert.deepEqual(calls.map(call => call.name), ["validateCookie", "fetchProduct", "extractType"]);
    assert.equal(result.success, true);
    assert.equal(result.data.productType, "耳机");
    assert.equal(result.data.id, "123456789");
  }

  {
    let fetchCount = 0;
    const result = await resolveOzonProductLink(
      {
        validateCookie: async () => ({ valid: true, message: "Cookie有效" }),
        fetchProduct: async (url: string) => {
          fetchCount += 1;
          if (fetchCount === 1) {
            return {
              sku: "4126865457",
              link: url,
              main_image: "https://cdn2.ozone.ru/s3/abt-challenge/incidents/images/warn.png",
              title: "Похоже, нет соединения",
              price: "",
            };
          }
          return {
            sku: "4126865457",
            link: "https://www.ozon.ru/product/watch-band-for-you-remeshok-braslet-dlya-chasov-neylon-4126865457/",
            main_image: "https://ir-2.ozonstatic.cn/s3/multimedia-1-h/wc1200/10131629057.jpg",
            title: "WATCH BAND FOR YOU 表带、表链",
            price: "7,23 ¥",
          };
        },
        extractType: async () => ({ type: "表带、表链", source: "type_field" }),
      },
      "https://www.ozon.ru/product/watch-band-for-you-remeshok-braslet-dlya-chasov-neylon-4126865457/",
    );

    assert.equal(fetchCount, 2);
    assert.equal(result.data.name, "WATCH BAND FOR YOU 表带、表链");
  }

  await assert.rejects(
    () => resolveOzonProductLink(
      {
        validateCookie: async () => ({ valid: true, message: "Cookie有效" }),
        fetchProduct: async (url: string) => ({
          sku: "4126865457",
          link: url,
          main_image: "https://cdn2.ozone.ru/s3/abt-challenge/incidents/images/warn.png",
          title: "Похоже, нет соединения",
          price: "",
        }),
        extractType: async () => ({ type: "", source: "" }),
      },
      "https://www.ozon.ru/product/watch-band-for-you-remeshok-braslet-dlya-chasov-neylon-4126865457/",
    ),
    /Ozon返回错误页/,
  );

  await assert.rejects(
    () => resolveOzonProductLink(
      {
        validateCookie: async () => ({ valid: true, message: "Cookie有效" }),
        fetchProduct: async (url: string) => ({
          sku: "3570095391",
          link: url,
          main_image: "https://img.test/main.jpg",
          title: "电吹风 3000 瓦特",
          price: "1 030 ₽",
          original_price: "9 799 ₽",
          currency: "RUB",
        }),
        extractType: async () => ({ type: "吹风机", source: "type_field" }),
      },
      "https://www.ozon.ru/product/fen-dlya-volos-3570095391/",
    ),
    /卢布价格/,
  );

  await assert.rejects(
    () => resolveOzonProductLink(
      {
        validateCookie: async () => ({ valid: true, message: "Cookie有效" }),
        fetchProduct: async () => { throw new Error("should not fetch"); },
        extractType: async () => ({ type: "", source: "" }),
      },
      "https://example.com/product/123456789/",
    ),
    /请输入有效的 Ozon 商品链接/,
  );

  await assert.rejects(
    () => resolveOzonProductLink(
      {
        validateCookie: async () => ({ valid: false, message: "Cookie文件不存在" }),
        fetchProduct: async () => { throw new Error("should not fetch"); },
        extractType: async () => ({ type: "", source: "" }),
      },
      "https://www.ozon.ru/product/test-123456789/",
    ),
    /Cookie文件不存在/,
  );

  console.log("ozon product link service assertions passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
