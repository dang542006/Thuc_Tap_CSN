-- Preserve the existing membership codes while allowing admins to manage new tiers.
ALTER TABLE `User`
  MODIFY COLUMN `membershipLevel` VARCHAR(32) NOT NULL DEFAULT 'BRONZE';

ALTER TABLE `Membership`
  MODIFY COLUMN `level` VARCHAR(32) NOT NULL;
