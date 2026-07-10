CREATE INDEX `products_supply_userId_createdAt_id_idx`
  ON `products_supply` (`userId`, `createdAt`, `id`);

CREATE INDEX `products_supply_userId_status_createdAt_id_idx`
  ON `products_supply` (`userId`, `status`, `createdAt`, `id`);
