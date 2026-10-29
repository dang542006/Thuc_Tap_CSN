# Architecture

## System overview

```text
Browser (React + Vite)
  └─ Axios services ── JSON/REST ──> Express app (/api)
                                      └─ routes + middleware
                                           └─ controllers
                                                └─ services
                                                     └─ repositories / Prisma
                                                          └─ MySQL
```

The frontend is a JavaScript single-page application. `frontend/src/routes/AppRoutes.jsx` mounts customer pages in `CustomerLayout` and admin pages in `AdminLayout`. `AuthProvider` restores session state using `/api/auth/me`; service modules own API calls and components do not use Axios directly.

The backend is Node.js + Express.js, written in JavaScript ES Modules. It is organized around route, middleware, controller, service and repository responsibilities. Prisma is the database access layer for MySQL. Some repository operations use Prisma transactions; the order flow uses serializable isolation.

## Backend layers

| Layer | Current responsibility |
| --- | --- |
| `routes/` | Mount endpoint paths and compose authentication, role, validation, upload and rate-limit middleware. |
| `middlewares/` | JWT authentication, admin authorization, Zod validation, async error forwarding, rate limits, Multer upload validation, 404/error handling. |
| `controllers/` | Read HTTP parameters/body, call services, return JSON envelope and HTTP status. The book-image controller also verifies image signatures and coordinates local file writes/removal. |
| `services/` | Implement catalog, cart, order, membership, promotion, review, profile and admin business rules. |
| `repositories/` | Perform Prisma reads/writes and expose transaction-scoped repositories. |
| `config/` | Validate environment, initialize/disconnect Prisma, resolve local upload paths. |
| `validators/` | Define Zod request schemas. |
| `constants/` | Roles, HTTP values and commerce rules such as shipping, points and order transitions. |

`models/index.js` is currently a placeholder for future domain helpers; it does not define or re-export model access. Database structure and generated model client are defined by Prisma in `backend/prisma/schema.prisma`.

## Backend source map

```text
backend/src/
├── config/          env.js, database.js, uploads.js
├── constants/       commerce.js, http.js, roles.js
├── controllers/     auth, books, categories, cart, orders, reviews,
│                   membership, profile, favorites, newsletter, admin
├── middlewares/     authenticate, authorize, validate, asyncHandler,
│                   errorHandler, notFound, rateLimits, uploadBookImage
├── models/          index.js
├── repositories/    user, customer, admin, newsletter
├── routes/          feature routers and API router
├── services/        feature business services
├── utils/           AppError, logger, slugify, asyncHandler
├── validators/      auth, customer, admin, newsletter, review
├── app.js
└── server.js
```

## Frontend source map

```text
frontend/src/
├── assets/
├── components/      shared storefront, states, toast, admin image upload
├── contexts/        AuthContext
├── hooks/           useApi
├── layouts/         CustomerLayout, AdminLayout
├── pages/           customer pages and AdminPages
├── routes/          AppRoutes, CustomerRoute, AdminRoute
├── services/        Axios instance and feature API services
├── utils/           API normalization and catalog helpers
├── constants/       API URL and auth token key
├── styles/          global responsive styles
├── App.jsx
└── main.jsx
```

## Request and error path

`app.js` configures static `/uploads`, CORS, JSON/urlencoded parsers, `/api/health`, API routes, a not-found handler and the global error handler. Routes apply `authenticate`, `authorize` and `validate` where needed. Express 5 async handlers forward rejected requests to the global error middleware. API responses follow `{ success, message, data }`; error responses use `data: null`.

The backend logger is Pino and redacts authorization/password fields. Production 5xx responses use a generic message and do not return a stack trace.

## Persistence and files

Prisma Client is shared from `config/database.js`. `server.js` connects to MySQL before listening and disconnects during SIGINT/SIGTERM shutdown. Book images are accepted in memory by Multer, written under `backend/uploads/books`, and exposed under `/uploads` by Express static middleware. The image path/URL is stored on `Book.image`.

## Scope notes

- Payment records and statuses exist, but no payment provider integration or payment routes exist yet.
- Admin dashboard returns empty `revenueTrend` in the current service; the report endpoint calculates paid-order aggregates.
- Gift card and gift endpoints are administrative CRUD; no customer redemption flow is present.
- Newsletter has a subscribe endpoint; the source does not include an email delivery integration.
