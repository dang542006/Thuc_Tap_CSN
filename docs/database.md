# Database and Prisma

## Configuration and migration

Prisma uses the MySQL provider. `backend/prisma/schema.prisma` is the source schema and `backend/prisma/migrations/20261008000000_init/` contains the checked-in initial migration. `DATABASE_URL` is required. Run `npm run prisma:generate`, then `npm run prisma:migrate -- --name init` for local development. Deployment can apply checked-in migrations with `npm run prisma:deploy`.

IDs are Prisma `cuid()` strings stored as `VARCHAR(30)`. Monetary fields use `DECIMAL(10,2)`. `createdAt` defaults to the current timestamp and `updatedAt` is maintained by Prisma. Record-like entities use `RecordStatus` (`ACTIVE`, `INACTIVE`) where declared.

## Models in the current schema

| Model | Main fields and role |
| --- | --- |
| `User` | name, unique email, bcrypt hash in `password`, optional unique phone/address, `UserRole`, status, points, membership level code stored as `VARCHAR(32)`. One optional cart, many orders/reviews/favorites/gift cards. |
| `Address` | User-owned delivery address with receiver name, phone, full address, type and default flag. A new additive migration copies any existing non-empty `User.address` into a default address and keeps the legacy profile field. |
| `Category` | name, unique slug, description, status. One-to-many books. |
| `Book` | product title, unique slug, brand, optional JSON technical specifications, description/image, price/optional discount price, stock, status and required category. The legacy `author` column remains for existing data compatibility. |
| `Cart` | Unique `userId`; one user cart with many items. |
| `CartItem` | cart, book, quantity; unique `(cartId, bookId)`. |
| `Order` | unique order number, user, order/payment statuses, subtotal/discount/shipping/total, shipping address, snapshotted receiver name and phone, payment method, optional note/promotion. Has items, payment records and status history. |
| `OrderStatusHistory` | order, status, description and timestamp for order tracking. |
| `OrderItem` | order, book, title, quantity, `unitPrice`, subtotal. Title and monetary values are saved as order-time snapshots. |
| `Review` | user, book, integer rating, optional comment, status; unique `(userId, bookId)`. |
| `Membership` | unique `VARCHAR(32)` level code, display name, minimum points, description and status. Stores tier thresholds; users store their current level code as a string. |
| `Promotion` | unique code, discount type/value, minimum order amount, start/end, optional usage limit, used count, status. Orders may refer to one promotion. |
| `GiftCard` | unique code, initial value, current balance, expiry/status, optional owner. |
| `Gift` | name/description/image, points cost, stock and status. |
| `Payment` | order, method/status, amount, optional provider/unique transaction reference and paid time. |
| `Favorite` | Join between user and book; composite primary key `(userId, bookId)`. |
| `NewsletterSubscriber` | unique email and status. |

## Enums

- `UserRole`: `CUSTOMER`, `ADMIN`.
- `RecordStatus`: `ACTIVE`, `INACTIVE`.
- `OrderStatus`: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPING`, `DELIVERED`, `CANCELLED`.
- `PaymentStatus`: `PENDING`, `PAID`, `FAILED`, `REFUNDED`.
- `PaymentMethod`: `COD`, `BANK_TRANSFER`, `CARD`, `E_WALLET`, `VNPAY` (checkout currently exposes COD and VNPAY).
- `DiscountType`: `PERCENTAGE`, `FIXED_AMOUNT`.

## Relationships and delete behavior

- Category 1—N Book (`Book.categoryId`, category deletion restricted while referenced).
- User 1—1 optional Cart (`Cart.userId` unique); Cart 1—N CartItem.
- User 1—N Order; Order 1—N OrderItem and Payment.
- Book 1—N CartItem, OrderItem, Review and Favorite.
- User 1—N Review and Favorite.
- Promotion 1—N Order; deleting a promotion sets a referencing order's promotion reference to null.
- User 1—N optional owned GiftCard.

Cascade/restrict/set-null rules are declared directly on Prisma relations; consult `schema.prisma` for the exact relation actions.

## Unique constraints and indexes

Unique constraints include user email/phone, category slug, book slug/ISBN, one cart per user, one cart item per cart/book, order number, review per user/book, membership level, promotion/gift-card code, newsletter email and payment transaction reference.

Indexes in the schema target user role/status, category status/name, book category/status/title/author, cart-item book, order user/date and status/date, order-item book, review book/status, favorite book, membership status/threshold, promotion status/date window, gift-card owner/status, gift status/cost and payment order/status. They are defined alongside each model in Prisma.

## Seed data

`backend/prisma/seed.js` upserts three categories, three books, one admin, two customers, four membership tiers, two sample orders and two reviews. The seed password is read from `BOOKSHOP_SEED_PASSWORD`, must be at least 12 characters, and is stored only as a bcrypt hash. Seed emails:

- `admin@bookshop.local`
- `lan.nguyen@bookshop.local`
- `minh.tran@bookshop.local`

The seed does not hard-code a usable password. Set the environment variable before running `npm run db:seed`.
