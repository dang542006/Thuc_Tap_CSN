ALTER TABLE `Category` ADD COLUMN `parentId` VARCHAR(30) NULL;
CREATE INDEX `Category_parentId_status_idx` ON `Category`(`parentId`, `status`);
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add only the subcategories represented by the existing 25-product catalog.
INSERT INTO `Category` (`id`, `name`, `slug`, `description`, `status`, `createdAt`, `updatedAt`, `parentId`)
SELECT `id`, `name`, `slug`, `description`, 'ACTIVE', NOW(3), NOW(3), `parentId` FROM (
  SELECT 'cat-cpu' AS `id`, 'CPU — Bộ vi xử lý' AS `name`, 'cpu' AS `slug`, 'Bộ vi xử lý máy tính để bàn.' AS `description`, (SELECT `id` FROM `Category` WHERE `slug`='linh-kien' LIMIT 1) AS `parentId`
  UNION ALL SELECT 'cat-gpu', 'GPU — Card đồ họa', 'gpu', 'Card đồ họa rời.', (SELECT `id` FROM `Category` WHERE `slug`='linh-kien' LIMIT 1)
  UNION ALL SELECT 'cat-ram', 'RAM — Bộ nhớ trong', 'ram', 'Bộ nhớ trong cho máy tính.', (SELECT `id` FROM `Category` WHERE `slug`='linh-kien' LIMIT 1)
  UNION ALL SELECT 'cat-storage', 'SSD/HDD — Ổ lưu trữ', 'o-luu-tru', 'Ổ lưu trữ SSD và HDD.', (SELECT `id` FROM `Category` WHERE `slug`='linh-kien' LIMIT 1)
  UNION ALL SELECT 'cat-mainboard', 'Mainboard — Bo mạch chủ', 'mainboard', 'Bo mạch chủ máy tính.', (SELECT `id` FROM `Category` WHERE `slug`='linh-kien' LIMIT 1)
  UNION ALL SELECT 'cat-psu', 'PSU — Bộ nguồn', 'nguon-may-tinh', 'Bộ nguồn máy tính.', (SELECT `id` FROM `Category` WHERE `slug`='linh-kien' LIMIT 1)
  UNION ALL SELECT 'cat-cooling', 'Tản nhiệt CPU', 'tan-nhiet-cpu', 'Tản nhiệt cho bộ xử lý.', (SELECT `id` FROM `Category` WHERE `slug`='linh-kien' LIMIT 1)
  UNION ALL SELECT 'cat-mouse', 'Chuột', 'chuot', 'Chuột máy tính.', (SELECT `id` FROM `Category` WHERE `slug`='phu-kien' LIMIT 1)
  UNION ALL SELECT 'cat-keyboard', 'Bàn phím', 'ban-phim', 'Bàn phím máy tính.', (SELECT `id` FROM `Category` WHERE `slug`='phu-kien' LIMIT 1)
  UNION ALL SELECT 'cat-audio', 'Tai nghe & âm thanh', 'tai-nghe-am-thanh', 'Tai nghe và thiết bị âm thanh.', (SELECT `id` FROM `Category` WHERE `slug`='phu-kien' LIMIT 1)
  UNION ALL SELECT 'cat-webcam', 'Webcam', 'webcam', 'Webcam và thiết bị hội nghị.', (SELECT `id` FROM `Category` WHERE `slug`='phu-kien' LIMIT 1)
  UNION ALL SELECT 'cat-network', 'Kết nối mạng', 'ket-noi-mang', 'Adapter và thiết bị kết nối mạng.', (SELECT `id` FROM `Category` WHERE `slug`='phu-kien' LIMIT 1)
) AS `newCategories`
WHERE `parentId` IS NOT NULL
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);

UPDATE `Book` SET `categoryId` = 'cat-cpu' WHERE `slug` = 'amd-ryzen-5-7600-desktop-cpu';
UPDATE `Book` SET `categoryId` = 'cat-ram' WHERE `slug` = 'kingston-fury-beast-16gb-ddr5';
UPDATE `Book` SET `categoryId` = 'cat-gpu' WHERE `slug` = 'asus-dual-geforce-rtx-4060-8gb';
UPDATE `Book` SET `categoryId` = 'cat-storage' WHERE `slug` IN ('wd-blue-sn580-1tb-nvme', 'samsung-990-evo-plus-1tb', 'crucial-p3-plus-1tb');
UPDATE `Book` SET `categoryId` = 'cat-mainboard' WHERE `slug` = 'gigabyte-b760m-ds3h-ddr4';
UPDATE `Book` SET `categoryId` = 'cat-psu' WHERE `slug` = 'msi-mag-a650bn-650w';
UPDATE `Book` SET `categoryId` = 'cat-cooling' WHERE `slug` = 'deepcool-ak400-cpu-cooler';
UPDATE `Book` SET `categoryId` = 'cat-mouse' WHERE `slug` IN ('logitech-g102-lightsync', 'logitech-m331-silent-plus', 'razer-deathadder-essential');
UPDATE `Book` SET `categoryId` = 'cat-keyboard' WHERE `slug` = 'logitech-pebble-keys-2-k380s';
UPDATE `Book` SET `categoryId` = 'cat-audio' WHERE `slug` IN ('logitech-g435-lightspeed', 'hyperx-cloud-stinger-2-core');
UPDATE `Book` SET `categoryId` = 'cat-webcam' WHERE `slug` = 'logitech-c270-hd-webcam';
UPDATE `Book` SET `categoryId` = 'cat-network' WHERE `slug` = 'tp-link-archer-tx20u-plus';
