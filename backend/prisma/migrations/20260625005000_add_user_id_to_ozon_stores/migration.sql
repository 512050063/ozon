ALTER TABLE `ozon_stores`
  ADD COLUMN `userId` INTEGER NULL;

CREATE INDEX `ozon_stores_userId_idx` ON `ozon_stores`(`userId`);
