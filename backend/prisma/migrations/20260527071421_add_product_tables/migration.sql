-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `permissions` JSON NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    UNIQUE INDEX `roles_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `wechatAvatar` VARCHAR(191) NULL,
    `wechatNickname` VARCHAR(191) NULL,
    `wechatOpenid` VARCHAR(191) NULL,
    `wechatUnionid` VARCHAR(191) NULL,
    `memberLevel` VARCHAR(191) NOT NULL DEFAULT 'free',
    `avatar` VARCHAR(191) NULL,
    `nickname` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `roleId` INTEGER NOT NULL DEFAULT 4,
    `trialExpiration` DATETIME(3) NULL,
    `hasClaimedTrial` BOOLEAN NOT NULL DEFAULT false,
    `memberExpiration` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_wechatOpenid_key`(`wechatOpenid`),
    UNIQUE INDEX `users_wechatUnionid_key`(`wechatUnionid`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wechat_login_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sceneStr` VARCHAR(191) NOT NULL,
    `ticket` VARCHAR(191) NOT NULL,
    `expireAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `openid` VARCHAR(191) NULL,
    `unionid` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wechat_login_sessions_sceneStr_key`(`sceneStr`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `titleOriginal` VARCHAR(191) NOT NULL,
    `titleTranslated` VARCHAR(191) NULL,
    `descriptionOriginal` VARCHAR(191) NULL,
    `descriptionTranslated` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `rating` DOUBLE NULL,
    `salesCount` INTEGER NOT NULL DEFAULT 0,
    `category` VARCHAR(191) NOT NULL,
    `specifications` JSON NULL,
    `images` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `discountedFboStocks` INTEGER NULL,
    `hasDiscountedFboItem` BOOLEAN NULL,
    `isArchived` BOOLEAN NULL,
    `isAutoArchived` BOOLEAN NULL,
    `isDiscounted` BOOLEAN NULL,
    `isKgt` BOOLEAN NULL,
    `isSeasonal` BOOLEAN NULL,
    `isSuper` BOOLEAN NULL,
    `minPrice` DOUBLE NULL,
    `oldPrice` DOUBLE NULL,
    `ozonAvailabilities` JSON NULL,
    `ozonBarcodes` JSON NULL,
    `ozonCategoryId` BIGINT NULL,
    `ozonColorImages` JSON NULL,
    `ozonCommissions` JSON NULL,
    `ozonCurrencyCode` VARCHAR(191) NULL,
    `ozonErrors` JSON NULL,
    `ozonImages360` JSON NULL,
    `ozonIsPrepaymentAllowed` BOOLEAN NULL,
    `ozonModelId` BIGINT NULL,
    `ozonModelInfo` JSON NULL,
    `ozonOfferId` VARCHAR(191) NULL,
    `ozonOriginalData` JSON NULL,
    `ozonPriceIndexes` JSON NULL,
    `ozonProductId` VARCHAR(191) NULL,
    `ozonPromotions` JSON NULL,
    `ozonSku` VARCHAR(191) NULL,
    `ozonSources` JSON NULL,
    `ozonStatuses` JSON NULL,
    `ozonStocks` JSON NULL,
    `ozonTypeId` BIGINT NULL,
    `ozonVisibilityDetails` JSON NULL,
    `primaryImages` JSON NULL,
    `vat` VARCHAR(191) NULL,
    `volumeWeight` DOUBLE NULL,
    `availabilities` VARCHAR(191) NULL,
    `colorIndex` VARCHAR(191) NULL,
    `currencyCode` VARCHAR(191) NULL,
    `moderateStatus` VARCHAR(191) NULL,
    `ozonIndexData` JSON NULL,
    `primaryImage` VARCHAR(191) NULL,
    `statusName` VARCHAR(191) NULL,
    `validationStatus` VARCHAR(191) NULL,
    `ozonCreatedAt` DATETIME(3) NULL,
    `ozonUpdatedAt` DATETIME(3) NULL,
    `externalIndexData` JSON NULL,
    `priceIndexValue` DOUBLE NULL,
    `selfMarketplacesIndexData` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouse_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `inventoryQuantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NULL,
    `ozonStoreId` INTEGER NULL,
    `ozonProductId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ozon_listings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouseItemId` INTEGER NOT NULL,
    `ozonProductId` VARCHAR(191) NOT NULL,
    `listingStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `price` DOUBLE NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analysis_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `parameters` JSON NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analysis_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `score` DOUBLE NOT NULL,
    `profitability` DOUBLE NULL,
    `rating` DOUBLE NULL,
    `salesCount` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `translation_cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `originalText` VARCHAR(191) NOT NULL,
    `translatedText` VARCHAR(191) NOT NULL,
    `sourceLang` VARCHAR(191) NOT NULL,
    `targetLang` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NOT NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 1,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `translation_cache_originalText_sourceLang_targetLang_key`(`originalText`, `sourceLang`, `targetLang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `config` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'valid',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_configs_userId_platform_key`(`userId`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricing_strategies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `basePrice` DOUBLE NOT NULL,
    `shippingPrice` DOUBLE NOT NULL,
    `tariffRate` DOUBLE NOT NULL,
    `profitRate` DOUBLE NOT NULL,
    `platformFeeRate` DOUBLE NOT NULL,
    `otherCost` DOUBLE NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `level` VARCHAR(191) NOT NULL DEFAULT 'info',
    `message` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `planType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `paymentMethod` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ozon_stores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `apiKey` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `productCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `apiUrl` VARCHAR(191) NOT NULL DEFAULT 'https://api-seller.ozon.ru/v1/seller/info',
    `country` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `isPremium` BOOLEAN NOT NULL DEFAULT false,
    `legalName` VARCHAR(191) NULL,
    `ratings` JSON NULL,
    `taxNumber` VARCHAR(191) NULL,

    UNIQUE INDEX `ozon_stores_storeId_key`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `thumbnailUrl` TEXT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `images_userId_idx`(`userId`),
    INDEX `images_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameRu` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NOT NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `packageLength` DOUBLE NOT NULL,
    `packageWidth` DOUBLE NOT NULL,
    `packageHeight` DOUBLE NOT NULL,
    `grossWeight` DOUBLE NOT NULL,
    `alibabaId` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `ozonProductId` VARCHAR(191) NULL,
    `ozonStoreId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_items_userId_idx`(`userId`),
    UNIQUE INDEX `product_items_userId_alibabaId_key`(`userId`, `alibabaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_item_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productItemId` INTEGER NOT NULL,
    `imageId` INTEGER NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_item_images_productItemId_idx`(`productItemId`),
    INDEX `product_item_images_imageId_idx`(`imageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ozon_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ozonId` BIGINT NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `parentId` INTEGER NULL,
    `ozonParentId` BIGINT NULL,
    `path` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'ZH_HANS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ozon_categories_ozonId_ozonParentId_key`(`ozonId`, `ozonParentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `category` VARCHAR(191) NOT NULL DEFAULT '',
    `brand` VARCHAR(191) NOT NULL DEFAULT '无品牌',
    `modelName` VARCHAR(191) NOT NULL DEFAULT '',
    `packageLength` DOUBLE NOT NULL DEFAULT 0,
    `packageWidth` DOUBLE NOT NULL DEFAULT 0,
    `packageHeight` DOUBLE NOT NULL DEFAULT 0,
    `grossWeight` DOUBLE NOT NULL DEFAULT 0,
    `alibabaId` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NOT NULL DEFAULT '',
    `price` DOUBLE NOT NULL DEFAULT 0,
    `isProcessed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `collection_items_userId_alibabaId_key`(`userId`, `alibabaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products_selection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ozonId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT '',
    `brand` VARCHAR(191) NOT NULL DEFAULT '',
    `price` DOUBLE NOT NULL DEFAULT 0,
    `originalPrice` DOUBLE NOT NULL DEFAULT 0,
    `discount` INTEGER NOT NULL DEFAULT 0,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `sales` INTEGER NOT NULL DEFAULT 0,
    `imageUrl` TEXT NULL,
    `productUrl` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_selection_ozonId_key`(`ozonId`),
    UNIQUE INDEX `products_selection_userId_ozonId_key`(`userId`, `ozonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products_supply` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT '',
    `brand` VARCHAR(191) NOT NULL DEFAULT '',
    `modelName` VARCHAR(191) NOT NULL DEFAULT '',
    `alibabaId` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NOT NULL DEFAULT '',
    `price` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_supply_userId_alibabaId_key`(`userId`, `alibabaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products_ozon` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ozonId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT '',
    `brand` VARCHAR(191) NOT NULL DEFAULT '',
    `price` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_ozon_ozonId_key`(`ozonId`),
    UNIQUE INDEX `products_ozon_userId_ozonId_key`(`userId`, `ozonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_item_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `collectionItemId` INTEGER NOT NULL,
    `imageId` INTEGER NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `collection_item_images_collectionItemId_idx`(`collectionItemId`),
    INDEX `collection_item_images_imageId_idx`(`imageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
