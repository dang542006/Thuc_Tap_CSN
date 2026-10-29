-- A permanent book delete must never cascade into its reviews or favorites.
ALTER TABLE `Review`
  DROP FOREIGN KEY `Review_bookId_fkey`;

ALTER TABLE `Review`
  ADD CONSTRAINT `Review_bookId_fkey`
  FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Favorite`
  DROP FOREIGN KEY `Favorite_bookId_fkey`;

ALTER TABLE `Favorite`
  ADD CONSTRAINT `Favorite_bookId_fkey`
  FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
