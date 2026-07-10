-- CreateTable
CREATE TABLE `ozon_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ozonStoreId` INTEGER NOT NULL,
    `postingNumber` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `inProcessAt` DATETIME(3) NULL,
    `shipmentDate` DATETIME(3) NULL,
    `customerName` VARCHAR(191) NULL,
    `deliveryMethod` VARCHAR(191) NULL,
    `products` JSON NULL,
    `totalPrice` DOUBLE NOT NULL DEFAULT 0,
    `raw` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ozon_orders_ozonStoreId_postingNumber_key`(`ozonStoreId`, `postingNumber`),
    INDEX `ozon_orders_ozonStoreId_idx`(`ozonStoreId`),
    INDEX `ozon_orders_status_idx`(`status`),
    INDEX `ozon_orders_inProcessAt_idx`(`inProcessAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
