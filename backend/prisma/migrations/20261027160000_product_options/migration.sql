CREATE TABLE `OptionGroup` (
  `id` VARCHAR(30) NOT NULL,
  `bookId` VARCHAR(30) NOT NULL,
  `groupName` VARCHAR(120) NOT NULL,
  `maxChoose` INTEGER NOT NULL DEFAULT 1,
  `required` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `OptionGroup_bookId_idx` (`bookId`),
  CONSTRAINT `OptionGroup_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OptionItem` (
  `id` VARCHAR(30) NOT NULL,
  `groupId` VARCHAR(30) NOT NULL,
  `optionName` VARCHAR(120) NOT NULL,
  `extraCost` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `OptionItem_groupId_idx` (`groupId`),
  CONSTRAINT `OptionItem_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `OptionGroup` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CartItem`
  DROP INDEX `CartItem_cartId_bookId_key`,
  ADD COLUMN `selectedOptions` JSON NULL,
  ADD INDEX `CartItem_cartId_bookId_idx` (`cartId`, `bookId`);

ALTER TABLE `OrderItem`
  ADD COLUMN `selectedSpecs` JSON NULL,
  ADD COLUMN `cartItemId` VARCHAR(30) NULL;
