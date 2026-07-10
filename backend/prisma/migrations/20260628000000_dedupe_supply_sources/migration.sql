-- Allow multiple product-library rows to bind to the same 1688 source row.
ALTER TABLE `products_supply`
  DROP INDEX `products_supply_supplySourceId_key`;

-- Merge duplicate 1688 source records by user and offer id before adding the unique key.
UPDATE `products_supply` ps
JOIN `supply_sources` ss ON ss.`id` = ps.`supplySourceId`
JOIN (
  SELECT `userId`, `alibabaOfferId`, MIN(`id`) AS `keepId`
  FROM `supply_sources`
  WHERE `alibabaOfferId` IS NOT NULL AND `alibabaOfferId` <> ''
  GROUP BY `userId`, `alibabaOfferId`
) keeper ON keeper.`userId` = ss.`userId`
  AND keeper.`alibabaOfferId` = ss.`alibabaOfferId`
SET ps.`supplySourceId` = keeper.`keepId`
WHERE ps.`supplySourceId` <> keeper.`keepId`;

DELETE ss
FROM `supply_sources` ss
JOIN (
  SELECT `userId`, `alibabaOfferId`, MIN(`id`) AS `keepId`
  FROM `supply_sources`
  WHERE `alibabaOfferId` IS NOT NULL AND `alibabaOfferId` <> ''
  GROUP BY `userId`, `alibabaOfferId`
) keeper ON keeper.`userId` = ss.`userId`
  AND keeper.`alibabaOfferId` = ss.`alibabaOfferId`
WHERE ss.`id` <> keeper.`keepId`;

CREATE INDEX `products_supply_supplySourceId_idx`
  ON `products_supply` (`supplySourceId`);

CREATE UNIQUE INDEX `supply_sources_userId_alibabaOfferId_key`
  ON `supply_sources` (`userId`, `alibabaOfferId`);
