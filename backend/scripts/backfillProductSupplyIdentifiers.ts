import prisma from '../src/config/database';
import { fillProductIdentifiers } from '../src/utils/productIdentifier';

async function main() {
  const items: Array<{
    id: number;
    userId: number;
    name: string;
    modelName: string;
    offerId: string | null;
    sku: string | null;
    alibabaId: string | null;
  }> = [];
  let cursor = 0;
  for (;;) {
    const page = await prisma.productSupply.findMany({
      where: { id: { gt: cursor } },
      orderBy: { id: 'asc' },
      take: 200,
      select: {
        id: true,
        userId: true,
        name: true,
        modelName: true,
        offerId: true,
        sku: true,
        alibabaId: true,
      },
    });
    if (page.length === 0) break;
    items.push(...page);
    cursor = page[page.length - 1].id;
  }

  const byUser = new Map<number, typeof items>();
  for (const item of items) {
    byUser.set(item.userId, [...(byUser.get(item.userId) || []), item]);
  }

  let updatedCount = 0;
  for (const [userId, rows] of byUser.entries()) {
    const preparedRows = rows.map(row => {
      const legacy = String(row.alibabaId || '').trim();
      const legacyLooksLikeOfferId = legacy.startsWith('OZ-');
      const offerId = row.offerId || (legacyLooksLikeOfferId ? legacy : '');
      const sku = row.sku || (!legacyLooksLikeOfferId ? legacy : '');
      return {
        id: row.id,
        offerId,
        sku,
        name: row.name,
        modelName: row.modelName,
      };
    });

    const filled = fillProductIdentifiers(preparedRows, {
      source: 'MAN',
      name: '商品库商品',
      existingOfferIds: [],
      existingSkus: [],
    });

    for (const row of filled) {
      const original = rows.find(item => item.id === row.id);
      if (!original) continue;
      if (original.offerId === row.offerId && original.sku === row.sku) continue;
      await prisma.productSupply.update({
        where: { id: row.id },
        data: {
          offerId: row.offerId,
          sku: row.sku,
        },
      });
      updatedCount += 1;
    }

    console.log(`user ${userId}: checked ${rows.length}`);
  }

  console.log(`backfilled product supply identifiers: ${updatedCount}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
