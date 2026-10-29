CREATE TABLE `Address` (
  `id` VARCHAR(30) NOT NULL,
  `userId` VARCHAR(30) NOT NULL,
  `receiverName` VARCHAR(120) NOT NULL,
  `phoneNumber` VARCHAR(30) NOT NULL,
  `fullAddress` VARCHAR(500) NOT NULL,
  `addressType` VARCHAR(40) NOT NULL DEFAULT 'HOME',
  `defaultAddress` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `Address_userId_defaultAddress_idx` (`userId`, `defaultAddress`),
  CONSTRAINT `Address_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Order` ADD COLUMN `receiverName` VARCHAR(120) NULL;

INSERT INTO `Address` (`id`, `userId`, `receiverName`, `phoneNumber`, `fullAddress`, `addressType`, `defaultAddress`, `createdAt`, `updatedAt`)
SELECT CONCAT('a', `id`), `id`, `name`, COALESCE(`phone`, ''), `address`, 'HOME', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `User`
WHERE `address` IS NOT NULL AND TRIM(`address`) <> '';
