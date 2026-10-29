# Authentication and authorization

## Credentials and token creation

Registration and login are implemented in `auth.service.js`. Emails are trimmed and lowercased. Passwords are hashed using bcrypt with 12 rounds and are never returned in public user payloads. Login uses `bcrypt.compare`; inactive accounts cannot log in. The same login endpoint is used by customers and admins; role is stored on the account.

JWTs are signed with `JWT_SECRET`, contain the account role claim and use the user ID as JWT subject (`sub`). Expiration comes from `JWT_EXPIRES_IN` (default `1d`). Secrets are validated from environment at backend startup and are not hard-coded.

## Sending and checking tokens

Send the token in the standard header:

```http
Authorization: Bearer <token>
```

`authenticate` verifies the signature/expiry, requires a subject, then reloads the current public user. It checks current account status and role from the database, so a disabled account or changed role cannot rely on stale JWT claims. The middleware puts only `{ id, role }` on `req.user`.

## Roles and access

- `CUSTOMER` and `ADMIN` are the Prisma `UserRole` values.
- Public endpoints do not require a token.
- Profile, cart, order, review creation/list-my-reviews, own membership, promotion validation and favorites require a token.
- Order and cart operations are scoped to the authenticated user's records in services/repositories.
- `admin.routes.js` applies `authenticate` and `authorize('ADMIN')` to every admin route. A signed-in customer receives 403.
- Login has no separate `/admin/login`; admin accounts use `POST /api/auth/login` and then access guarded admin endpoints.

## Browser session

The frontend stores the access token in browser `localStorage` under `bookshop_access_token`. The Axios request interceptor adds the Bearer header when the token exists. `AuthProvider` loads `/auth/me` on startup, and removes the local token after a 401 event or when logout is called. Logout is client-side token removal; the backend does not expose a token revocation/logout endpoint.

## Validation and protections

Zod validates request bodies before controllers run. Auth endpoints have an in-memory rate limit of 10 requests per IP per 15 minutes. Image upload has a separate limit. Errors return the standard JSON envelope and production 5xx responses do not expose stack traces. Pino redacts authorization and password fields.
