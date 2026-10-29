# Business rules and flows

These rules are implemented in backend services and constants. The backend is authoritative for catalog price, inventory, promotions, totals, order status and membership points.

## Customer flow

1. Register or log in through `/api/auth`; successful authentication returns a JWT.
2. Browse active laptop/component products and categories. Catalog supports name/brand search, category/brand/price/rating filters, sorting and pagination.
3. Add/update/remove cart lines. The cart belongs to the authenticated user; quantity must be a positive integer, book must be active, and requested quantity cannot exceed stock.
4. Checkout sends shipping address, payment method and optional promotion code. Client-supplied price/discount/shipping/total fields are not part of the strict request schema.
5. View own order list/detail; cancel only an eligible order. Profile update/password change, membership, favorites and review endpoints require authentication.

## Catalog and cart

Only active products/categories appear in public catalog queries. Product records include manufacturer `brand` and optional JSON technical `specifications`. A discount price is used only when it is positive and lower than its regular price. Cart display computes line subtotals from the current server catalog price; cart items do not store a price snapshot.

Admins hide/reactivate books by updating `Book.status`. Permanent book deletion is allowed only when no cart item, order item, review or favorite references the book; those relations use restrictive foreign keys so deletion cannot cascade into customer or order data. A book must use an active category when created or moved to a different category.

Admins hide/reactivate categories by updating `Category.status`; hiding a category does not change its books. Permanent category deletion is allowed only when no books reference it. The `Book.categoryId` foreign key uses `RESTRICT`, and the admin API returns `409 CATEGORY_IN_USE` with guidance to hide the category when it still has books.

## Order and inventory flow

Checkout runs in a serializable Prisma transaction:

1. Load the current user's cart and active books.
2. Reject empty cart, inactive/unavailable books, invalid quantities or insufficient stock.
3. Compute unit price, line subtotal, subtotal, promotion discount, shipping fee and final total in backend code using cents to avoid floating-point currency arithmetic.
4. Reserve promotion usage when a promotion is supplied.
5. Conditionally decrement stock, requiring enough current inventory.
6. Create the order and `OrderItem` rows with title, unit price and line subtotal snapshots.
7. Create a `Payment` record with `PENDING` status and append the initial order status event. Clear the cart immediately for COD; retain VNPAY items until a signed successful callback. Update membership points inside the same transaction.

Current shipping constants are 30,000 VND standard fee and free shipping at a pre-promotion subtotal of 500,000 VND. Promotion discount applies to the subtotal and is capped at the subtotal. The promotion must be active, within its date range, meet its minimum order amount and have remaining usage if limited.

The transaction rolls back together if a step fails. Admin dashboard/report revenue sums orders whose payment status is `PAID`; best sellers are based on delivered orders.

## Order status and cancellation

Allowed admin transitions in `constants/commerce.js`:

```text
PENDING    → CONFIRMED | CANCELLED
CONFIRMED  → PROCESSING | CANCELLED
PROCESSING → SHIPPING
SHIPPING   → DELIVERED
DELIVERED  → (terminal)
CANCELLED  → (terminal)
```

An admin cannot cancel a paid order without a refund first. A non-COD order must be paid before it can be marked delivered. When COD order is marked delivered, payment and pending payment rows are changed to `PAID`.

Customers can cancel only `PENDING` or `CONFIRMED` orders whose payment is not `PAID`. Cancellation restores stock, releases reserved promotion use, marks pending payment records `FAILED`, marks the order `CANCELLED`/payment `FAILED`, and reverses the points awarded for that order.

## Payment flow

Checkout supports `COD` and `VNPAY`. VNPAY checkout is rejected before the order transaction if `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` or `VNPAY_RETURN_URL` is missing. The backend creates the signed payment URL; the frontend redirects to the configured provider. Both browser return and server IPN verify `vnp_SecureHash` with HMAC-SHA512 before changing order state. A valid success marks payment `PAID` and removes the purchased lines from the retained cart. A valid failure marks payment `FAILED`, cancels the order, restores inventory and reserved promotion use, reverses points and leaves the cart intact. Repeated callbacks are idempotent for orders already resolved. No refund endpoint is implemented.

The receiver phone is snapshotted on each order. Public `GET /api/orders/track?orderNumber=...&phone=...` returns an order only when both values match and includes its status history. Every order creation, customer/admin cancellation and admin status transition appends an `OrderStatusHistory` row.

## Membership

The user record holds `points` and a membership level code string; `Membership` rows define unique level codes (up to 32 characters), names and `minPoints` thresholds. At checkout, points are calculated as one point per 10,000 VND of final order total, rounded down, and added when the order is created (even while payment remains pending). The current level is recalculated against active thresholds, with `BRONZE` as the fallback. Eligible order cancellation reverses the points. `GET /api/membership/me` returns points, level, current/next tier and points remaining to next tier. Admin may soft-deactivate an unused tier and restore it by setting `status` to `ACTIVE`; the fallback `BRONZE` tier and tiers assigned to customers cannot be deactivated. A level code cannot be changed while customers are assigned to that tier.

## Reviews

Rating must be an integer from 1 to 5. An authenticated user may review a book only after at least one of their orders containing it has status `DELIVERED`. The database enforces one review per user/book pair; creating another review upserts the existing one and makes it active again. Public review queries include only active reviews. Admin can approve, hide or delete reviews.

## Promotions, gift cards and gifts

Promotions can be listed publicly when active and currently in date range, validated against the current cart, and applied during checkout. Usage reservation occurs within checkout transaction. Admin can CRUD and activate/deactivate promotions.

Gift cards and gifts currently have admin list/create/update/deactivate APIs and Prisma models. There is no customer gift-card balance redemption, gift redemption or points-exchange flow in the current source.
