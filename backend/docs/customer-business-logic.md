# Customer API and business rules

The catalog represents laptops, computer components and accessories. Products include a brand and optional JSON technical specifications. Orders snapshot the receiver phone and record each order status change for tracking. Checkout supports COD and configured VNPAY; signed callbacks are required before a VNPAY payment is marked paid.

All endpoints are mounted under `/api`. Protected routes require `Authorization: Bearer <JWT>`.

## Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Customer/Admin |
| GET / PATCH | `/users/me` | Customer/Admin |
| PATCH | `/users/me/password` | Customer/Admin |
| GET | `/books` | Public |
| GET | `/books/:idOrSlug` | Public |
| GET | `/books/:idOrSlug/related` | Public |
| GET | `/categories` | Public |
| GET / POST | `/cart` and `/cart/items` | Customer/Admin |
| PATCH / DELETE | `/cart/items/:itemId` | Customer/Admin |
| DELETE | `/cart` | Customer/Admin |
| GET / POST | `/orders` | Customer/Admin |
| GET | `/orders/:orderId` | Owner only |
| POST | `/orders/:orderId/cancel` | Owner only |
| GET | `/reviews` | Public |
| GET | `/reviews/mine` | Customer/Admin |
| POST | `/reviews` | Customer/Admin |
| GET | `/membership/me` | Customer/Admin |
| GET | `/membership/tiers` | Public |
| GET | `/promotions/active` | Public |
| POST | `/promotions/validate` | Customer/Admin |

Book listing supports `q`, `categoryId`, `minPrice`, `maxPrice`, `rating`, `sort`, `page`, and `limit`. Results include `items`, `total`, `page`, `limit`, and `totalPages`.

## Cart and checkout

Cart operations require an authenticated user. Quantities are positive integers, books must be active, and quantity cannot exceed current stock. Checkout accepts only a shipping address, payment method, and optional promotion code; client supplied prices, discounts, shipping fees, and totals are rejected by strict request validation.

Checkout reads the user's cart and active catalog prices in a serializable Prisma transaction. It chooses a valid book discount price when available, calculates promotion discount and shipping on the server, conditionally decrements inventory, creates the order and immutable item price snapshots, creates a pending payment record, clears the cart, and updates points. A failure rolls the transaction back. Free shipping currently applies at a pre-promotion subtotal of 500,000 VND; standard shipping is 30,000 VND.

Payment records remain `PENDING` until a trusted payment provider integration updates them. Creating an order is not treated as collecting money. Customer cancellation is limited to pending or confirmed, unpaid orders; it restores inventory and releases promotion usage.

Points are awarded when an order is placed at one point per 10,000 VND of final order total and reversed if the eligible order is cancelled. Membership level is recalculated from the configured `Membership` tier thresholds. Review creation requires a delivered order containing the reviewed book; rating is validated as an integer from 1 to 5.
