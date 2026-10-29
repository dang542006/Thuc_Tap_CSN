# BookShop Admin API

All endpoints use the `/api/admin` prefix and require a valid JWT with the `ADMIN` role. The admin router runs `authenticate` before `authorize('ADMIN')`, so an authenticated `CUSTOMER` receives `403 Forbidden`.

Responses follow `{ "success": true, "message": "...", "data": ... }`; errors follow `{ "success": false, "message": "...", "data": null }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/dashboard` | Revenue, orders, customers, books, low stock, best sellers |
| GET, POST | `/books` | Search/filter/paginate books; create a book |
| GET, PATCH, DELETE | `/books/:id` | Read, update, or deactivate a book |
| POST | `/books/:id/image` | Upload/replace the cover (`multipart/form-data`, field `image`, max 5 MB) |
| DELETE | `/books/:id/image` | Remove the cover image |
| GET, POST | `/categories` | List or create categories |
| GET, PATCH, DELETE | `/categories/:id` | Read, update, or deactivate a category |
| GET | `/orders` | Search/filter/paginate orders |
| GET | `/orders/:id` | Order detail |
| PATCH | `/orders/:id/status` | Advance or cancel an order subject to the state machine |
| GET | `/customers` | Search/filter/paginate customers |
| GET | `/customers/:id` | Customer detail |
| PATCH | `/customers/:id/lock` | Lock a customer account |
| PATCH | `/customers/:id/unlock` | Unlock a customer account |
| GET | `/reviews` | Search/filter/paginate reviews |
| PATCH | `/reviews/:id/approve` | Approve a review |
| PATCH | `/reviews/:id/hide` | Hide a review |
| DELETE | `/reviews/:id` | Delete a review |
| GET, POST | `/promotions` | List or create promotions |
| PATCH, DELETE | `/promotions/:id` | Update or delete a promotion |
| PATCH | `/promotions/:id/activate` | Activate a promotion |
| PATCH | `/promotions/:id/deactivate` | Deactivate a promotion |
| GET, POST | `/membership` | List or create membership tiers |
| PATCH, DELETE | `/membership/:id` | Update or deactivate a tier |
| GET | `/reports` | Paid revenue and order report; query `from`, `to`, `type=month|day` |
| GET, POST | `/gift-cards` | List or create gift cards |
| PATCH, DELETE | `/gift-cards/:id` | Update or deactivate a gift card |
| GET, POST | `/gifts` | List or create redemption gifts |
| PATCH, DELETE | `/gifts/:id` | Update or deactivate a gift |

Book and category deletion is a soft deactivation to preserve historical order references. Order cancellation must restore stock and release reserved promotion usage in the transaction. A delivered COD order is marked paid; other payment methods are not marked paid without a verified payment-provider callback.

Uploaded covers are saved beneath `uploads/books` and served from `/uploads/books/<generated-name>`. The server checks the extension and MIME type in Multer and then checks the file signature before storing. Only JPG/JPEG, PNG, and WEBP are accepted. The frontend upload widget is `frontend/src/components/admin/BookImageUpload.jsx`; render it in the book editor with `bookId`, current `value`, and `onChange` props. A book must be saved first so it has an ID before its cover can be uploaded.

Customer favorites and newsletter signups are persisted through Prisma (`Favorite`, `NewsletterSubscriber`) and are included in the initial MySQL migration.
