import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  IMAGE_BIZ_TYPES,
  IMAGE_PROVIDERS,
  assertImageBizType,
  assertImageProvider,
  buildImageUsageSummary,
  collectProductImageUrls,
  dedupeImageUrls,
  findProductImageIdsByUrls,
  normalizeRefKey,
  replaceImageReferences,
  replaceProductSupplyImageReferences,
  syncProductSupplyImageReferences,
} from "../services/imageAssetService";

const schemaPath = path.resolve(__dirname, "../../prisma/schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");
const imageControllerPath = path.resolve(__dirname, "../controllers/imageController.ts");
const imageControllerSource = fs.readFileSync(imageControllerPath, "utf8");

assert.match(
  schema,
  /model\s+Image\s*\{[\s\S]*bizType\s+ImageBizType\s+@default\(product\)[\s\S]*provider\s+ImageProvider\s+@default\(local\)[\s\S]*references\s+ImageReference\[\][\s\S]*\}/,
  "Image model should keep local image assets and references",
);
assert.match(imageControllerSource, /provider:\s*'local'/, "image controller should query and write local provider records");
assert.match(imageControllerSource, /fileUrl:\s*`\/uploads\/images\/\$\{fileName\}`/, "uploads should store managed /uploads/images paths");
assert.doesNotMatch(imageControllerSource, /axios\.(get|post|delete)/, "image controller should not call third-party image host APIs");

async function main() {
  assert.deepEqual(IMAGE_BIZ_TYPES, ["avatar", "product"]);
  assert.deepEqual(IMAGE_PROVIDERS, ["local"]);

  assert.equal(assertImageBizType("avatar"), "avatar");
  assert.equal(assertImageBizType("product"), "product");
  assert.throws(() => assertImageBizType("other"), /Invalid image biz type/);
  assert.equal(assertImageProvider("local"), "local");
  assert.throws(() => assertImageProvider("remote"), /Invalid image provider/);

  assert.deepEqual(
    dedupeImageUrls([" https://img.test/a.jpg ", "", "https://img.test/a.jpg", " /uploads/images/a.png "]),
    ["https://img.test/a.jpg", "/uploads/images/a.png"],
  );

  assert.deepEqual(
    collectProductImageUrls({
      imageUrl: " /uploads/images/cover.jpg ",
      images: [
        "https://site.test/uploads/images/gallery-a.jpg",
        { url: "/uploads/images/gallery-b.jpg" },
        { fileUrl: "/uploads/images/gallery-a.jpg" },
        { imageUrl: "https://site.test/uploads/images/gallery-c.jpg" },
      ],
    }),
    [
      "/uploads/images/cover.jpg",
      "https://site.test/uploads/images/gallery-a.jpg",
      "/uploads/images/gallery-b.jpg",
      "/uploads/images/gallery-a.jpg",
      "https://site.test/uploads/images/gallery-c.jpg",
    ],
  );

  assert.equal(normalizeRefKey(undefined), null);
  assert.equal(normalizeRefKey(" image:0 "), "image:0");
  assert.throws(() => normalizeRefKey("x".repeat(101)), /Invalid ref key/);

  assert.deepEqual(
    buildImageUsageSummary([
      { refType: "product_supply", refId: 1, refKey: "image:0" },
      { refType: "avatar", refId: 2, refKey: null },
    ]),
    {
      isUsed: true,
      usedRefCount: 2,
      usedRefTypes: ["avatar", "product_supply"],
    },
  );

  const writes: unknown[] = [];
  const tx = {
    imageReference: {
      async deleteMany(args: unknown) {
        writes.push(["deleteMany", args]);
      },
      async createMany(args: unknown) {
        writes.push(["createMany", args]);
      },
    },
  };

  const refs = await replaceImageReferences(tx, {
    userId: 7,
    refType: "product_supply",
    refId: 9,
    imageIds: [3, 3, 4],
    keyBuilder: (_id, index) => `image:${index}`,
  });
  assert.deepEqual(refs.map(ref => ref.imageId), [3, 4]);
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0], ["deleteMany", {
    where: {
      userId: 7,
      refType: "product_supply",
      refId: 9,
    },
  }]);

  const imageFindArgs: unknown[] = [];
  const db = {
    image: {
      async findMany(args: unknown) {
        imageFindArgs.push(args);
        return [{ id: 11 }, { id: 12 }];
      },
      async createMany(args: unknown) {
        writes.push(["imageCreateMany", args]);
      },
    },
    imageReference: tx.imageReference,
  };

  assert.deepEqual(
    await findProductImageIdsByUrls(db, {
      userId: 7,
      imageUrl: "https://site.test/uploads/images/a.png",
      images: ["/uploads/images/b.png"],
    }),
    [11, 12],
  );
  assert.deepEqual(imageFindArgs[0], {
    where: {
      bizType: "product",
      provider: "local",
      userId: 7,
      OR: [
        { fileUrl: { contains: "https://site.test/uploads/images/a.png" } },
        { fileUrl: { contains: "/uploads/images/a.png" } },
        { fileUrl: { contains: "/uploads/images/b.png" } },
      ],
    },
    select: { id: true },
  });

  await replaceProductSupplyImageReferences(db, {
    userId: 7,
    productSupplyId: 9,
    imageUrl: "https://site.test/uploads/images/a.png",
    images: ["/uploads/images/b.png"],
  });

  const syncDb = {
    image: db.image,
    imageReference: tx.imageReference,
    productSupply: {
      async findMany() {
        return [
          { id: 1, imageUrl: "/uploads/images/a.png", images: ["/uploads/images/b.png"] },
          { id: 2, imageUrl: "", images: [] },
        ];
      },
    },
  };
  const result = await syncProductSupplyImageReferences(syncDb, 7);
  assert.equal(result.productCount, 2);
  assert.equal(result.referenceCount, 2);

  console.log("imageAssetService tests passed");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
