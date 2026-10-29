# Setup and local development

## Requirements

- Node.js and npm compatible with the checked-in package dependencies.
- MySQL server accessible to the backend.
- A MySQL database named `thuc_tap_csn` (or change the database name in `DATABASE_URL`).

There is no root package manifest: install and run backend and frontend separately.

## 1. Configure and migrate MySQL

Create the database if needed, for example:

```sql
CREATE DATABASE thuc_tap_csn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

In PowerShell, copy the environment template and edit the resulting file:

```powershell
Copy-Item backend/.env.example backend/.env
```

Set at minimum:

```dotenv
NODE_ENV=development
PORT=5000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=mysql://USER:PASSWORD@127.0.0.1:3306/thuc_tap_csn
JWT_SECRET=<random secret of at least 32 characters>
JWT_EXPIRES_IN=1d
BOOKSHOP_SEED_PASSWORD=<development password of at least 12 characters>
VNPAY_TMN_CODE=<sandbox merchant code>
VNPAY_HASH_SECRET=<sandbox hash secret>
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5000/api/payments/vnpay/return
FRONTEND_URL=http://localhost:5173
```

`DATABASE_URL` and `JWT_SECRET` are required. `PORT` defaults to 5000, `CORS_ORIGINS` to `http://localhost:5173`, and `JWT_EXPIRES_IN` to `1d`. Do not commit `.env` or use the example credentials/secrets in production.

Percent-encode reserved characters in the MySQL username or password before placing them in `DATABASE_URL` (for example, `@` becomes `%40`). Keep the actual URL only in `backend/.env`.

Install and apply the checked-in migrations from `backend/`. For a fresh database, `npm run prisma:deploy` creates the schema and applies the computer catalog, order tracking, VNPAY, saved addresses, and product options migrations. It also applies any pending migrations on an existing installation. The address migration copies each existing non-empty `User.address` value into a default `Address` row and keeps the legacy profile field.

```powershell
Set-Location backend
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run catalog:expand
npm run dev
```

The seed requires `BOOKSHOP_SEED_PASSWORD` and hashes it with bcrypt. The seed upserts data and uses the same supplied password for its local admin and customer accounts. Avoid using real personal credentials for seed data.

`npm run catalog:expand` is a separate, idempotent catalog import for the computer products. It adds only missing stable product slugs and fills an existing product image only when its image field is null. It does not clear tables, delete records, or rerun the full seed. Product photo sources and original illustrations are recorded in `docs/product-image-sources.json`; prices and stock values in this local catalog are demo values and must be confirmed before real sales.

For production migration deployment, use `npm run prisma:deploy` after installing dependencies and generating the client as required by the deployment environment. The checked-in initial migration is for a fresh schema. If tables already exist without migration history, baseline the database before applying migrations; do not apply the initial migration over existing tables.

Backend scripts in `backend/package.json`:

| Script | Action |
| --- | --- |
| `npm run dev` | Start Node with watch mode. |
| `npm start` | Start the API server. |
| `npm test` | Run Node's test runner over `backend/test`. |
| `npm run prisma:generate` | Generate Prisma Client. |
| `npm run prisma:migrate -- --name <name>` | Create and apply a new development migration after editing the Prisma schema. |
| `npm run prisma:deploy` | Apply checked-in migrations. |
| `npm run db:seed` | Insert/upsert local seed data. |
| `npm run catalog:expand` | Add missing computer catalog products by stable slug; safe to rerun. |

## 2. Configure and run frontend

In another PowerShell window:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

Set the Vite API base URL (the example points to Express):

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Then install and start from `frontend/`:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. `CORS_ORIGINS` in backend must include the frontend origin.

## 3. Verify

- Visit `http://localhost:5000/api/health`; healthy API responds with `{ success: true, ... }`.
- Register a customer through the frontend or `POST /api/auth/register`.
- The seed script creates local demo users from `backend/prisma/seed.js`; set their shared local password through `BOOKSHOP_SEED_PASSWORD`. Do not use these accounts as production credentials.
- Run backend checks with `npm test` from `backend/`.
- Build the frontend with `npm run build` from `frontend/`.

## Upload storage

Product images are served from `backend/uploads` at `/uploads` (catalog assets are in `backend/uploads/catalog`; admin uploads use `backend/uploads/books`). This is local filesystem storage, so production deployments need a persistent volume or a separate object storage integration if uploads must survive replacement of the server instance.

## Local Admin account

The local Admin bootstrap uses the existing Prisma `User` model, `ADMIN` role, bcrypt password hashing, and the existing login API. In `backend/.env`, set `ADMIN_BOOTSTRAP_EMAIL` to the local account email you want to use (defaults to `admin@techstore.local`); leave `ADMIN_BOOTSTRAP_PASSWORD` blank to generate a strong local password, or provide a private password of 8–72 UTF-8 bytes. Run `npm run admin:bootstrap` from `backend/`. The bootstrap is idempotent and only creates or updates that configured account; other Admin accounts are left in place. Keep `backend/.env` private; it is ignored by Git. Verify the running service with `npm run admin:verify` from `backend/`.

To reset an existing active local Admin after changing `ADMIN_BOOTSTRAP_PASSWORD` in `backend/.env`, run `npm run admin:reset-password` from `backend/`. This command updates only the password hash for the configured email, requires the account to already be active with the `ADMIN` role, and does not print the password or hash. The password must be 8–72 UTF-8 bytes, matching the authentication validator. The API reads the new hash from MySQL at login, so a backend restart is not needed for this password reset.

## Product advisor (optional OpenAI)

The product advisor first filters active, in-stock catalog records in MySQL. When OpenAI is configured, the backend sends only the shortlist and the user's recent product requirements to the Responses API. The browser never receives the API key. Without a key, or when AI is unavailable, the advisor clearly labels its catalog-based rule recommendations.

Set these only in `backend/.env` (copy from `.env.example`); do not add them to frontend variables or commit the local `.env`:

```dotenv
OPENAI_API_KEY=your-secret-key
OPENAI_MODEL=gpt-4.1-mini
ADVISOR_TIMEOUT_MS=12000
```

Restart the backend after editing `.env`. The advisor endpoint is rate-limited to 10 requests per minute per client IP, accepts up to 8 messages of 500 characters each, and uses a 12-second timeout by default. Set an appropriate project spending limit with the API provider before enabling a paid model.
