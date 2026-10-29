# BookShop backend

Node.js ES Modules, Express, Prisma ORM, and MySQL REST API.

## Setup

1. Copy `.env.example` to `.env`, set a MySQL `DATABASE_URL`, allow the frontend origin in `CORS_ORIGINS`, and provide a random `JWT_SECRET` with at least 32 characters.
2. Install packages with `npm install`.
3. Generate Prisma Client with `npm run prisma:generate`.
4. Create the database schema with `npm run prisma:migrate -- --name init`.
5. Set `BOOKSHOP_SEED_PASSWORD` to a development password of at least 12 characters, then add sample data with `npm run db:seed`.
6. Start development server with `npm run dev`.

The checked-in initial migration supports a fresh MySQL database. For a database that already has these tables but no Prisma migration history, baseline it before running `migrate deploy`; do not apply the initial migration over existing tables.

Authentication and image upload endpoints have per-IP rate limits. The default in-memory limiter is intended for a single backend process; use a shared store when running multiple instances. Run the validation and authorization tests with `npm test`.

## API

All API routes use the `/api` prefix.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API health check |
| POST | `/api/auth/register` | Public | Register a customer and create an empty cart |
| POST | `/api/auth/login` | Public | Verify credentials and issue a JWT |
| GET | `/api/auth/me` | Bearer JWT | Return the authenticated user's profile |

Success and error responses use `{ success, message, data }`. Production errors never include stack traces.

## Layers

- `routes`: endpoint definitions and middleware composition.
- `middlewares`: authentication, role checks, Zod validation, async forwarding, and centralized errors.
- `controllers`: HTTP input/output only.
- `services`: authentication and account business rules.
- `repositories`: Prisma persistence operations.
- `prisma/schema.prisma`: MySQL models, relationships, constraints, and indexes.
- `config`: validated environment and shared Prisma client lifecycle.

## Database shape

`User` stores the bcrypt password hash in `password`, plus address, points, and membership level. `Membership` stores the configured tier thresholds. A user has one cart and many orders/reviews; each order has many order items and each book belongs to one category and can appear in many order items/reviews. `OrderItem.unitPrice` and `subtotal` are snapshots captured at purchase time. Email, book slug, category slug, order number, and user/book review pairs are unique; indexes cover book title/category and order user/status lookups.

Seed accounts are `admin@bookshop.local`, `lan.nguyen@bookshop.local`, and `minh.tran@bookshop.local`. Each account uses the bcrypt hash of the `BOOKSHOP_SEED_PASSWORD` value supplied to the seed process; the password itself is not stored in source code.
