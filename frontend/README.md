# BookShop frontend

React + Vite single-page application written in JavaScript. No TypeScript or demo catalog data is used.

## Run locally

1. Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend API prefix (default `http://localhost:5000/api`).
2. Run `npm install`.
3. Run `npm run dev` and open the URL printed by Vite.

## Structure

- `src/layouts`: customer storefront and admin shell.
- `src/pages`: customer and admin page modules.
- `src/routes`: customer/admin access guards and route table.
- `src/contexts`: authentication state and session restoration.
- `src/services`: Axios API client and endpoint modules.
- `src/components`: shared navigation, book cards, search, and loading/error/empty states.
- `src/styles`: responsive storefront and admin design system.

## API behavior

All remote data comes from the configured backend. Requests use the `{ success, message, data }` envelope. The Axios client adds the saved Bearer token and clears the session after a 401. Customer access requires a signed-in account; `/admin/*` also requires role `ADMIN`.

The current backend implementation must expose catalog, cart, orders, reviews, membership, and admin endpoints for those pages to populate. If an endpoint is unavailable, the UI shows its API error or empty state rather than substituting mock data. Auth screens use `/auth/register`, `/auth/login`, and `/auth/me`.
