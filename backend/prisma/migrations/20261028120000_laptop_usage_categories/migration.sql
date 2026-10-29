-- Split the existing exact-SKU laptops by documented product positioning.
INSERT INTO `Category` (`id`, `name`, `slug`, `description`, `status`, `createdAt`, `updatedAt`, `parentId`)
SELECT `id`, `name`, `slug`, `description`, 'ACTIVE', NOW(3), NOW(3), `parentId` FROM (
  SELECT 'cat-laptop-office' AS `id`, 'Laptop văn phòng & học tập' AS `name`, 'laptop-van-phong-hoc-tap' AS `slug`, 'Laptop phổ thông với đồ họa tích hợp, hướng tới học tập và công việc hằng ngày.' AS `description`, (SELECT `id` FROM `Category` WHERE `slug`='laptop' LIMIT 1) AS `parentId`
  UNION ALL SELECT 'cat-laptop-gaming', 'Laptop gaming', 'laptop-gaming', 'Laptop có GPU đồ họa rời và màn hình tốc độ làm tươi cao theo thông số SKU.', (SELECT `id` FROM `Category` WHERE `slug`='laptop' LIMIT 1)
) AS `newCategories`
WHERE `parentId` IS NOT NULL
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);

UPDATE `Book` SET `categoryId` = 'cat-laptop-office'
WHERE `slug` IN ('thinkpad-e14-gen-6', 'asus-vivobook-15-x1504va', 'dell-inspiron-5440-i5-16gb', 'acer-aspire-5-a515-58m-79r7', 'lenovo-ideapad-slim-5-14irl8', 'hp-15-fd-series');
UPDATE `Book` SET `categoryId` = 'cat-laptop-gaming'
WHERE `slug` IN ('asus-tuf-gaming-a15-fa507nv', 'acer-nitro-v15-anv15-41-r2up');
