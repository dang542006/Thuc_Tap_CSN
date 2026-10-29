ALTER TABLE `Book`
  ADD COLUMN `brand` VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN `specifications` JSON NULL;

ALTER TABLE `Order`
  ADD COLUMN `receiverPhone` VARCHAR(30) NULL;

ALTER TABLE `Order`
  MODIFY `paymentMethod` ENUM('COD', 'BANK_TRANSFER', 'CARD', 'E_WALLET', 'VNPAY') NOT NULL;

ALTER TABLE `Payment`
  MODIFY `method` ENUM('COD', 'BANK_TRANSFER', 'CARD', 'E_WALLET', 'VNPAY') NOT NULL;

CREATE TABLE `OrderStatusHistory` (
  `id` VARCHAR(30) NOT NULL,
  `orderId` VARCHAR(30) NOT NULL,
  `status` ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED') NOT NULL,
  `description` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `OrderStatusHistory_orderId_createdAt_idx` (`orderId`, `createdAt`),
  CONSTRAINT `OrderStatusHistory_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
