# Auction PRO

## Open the app

Double-click Start-Auction.cmd, leave the terminal open, and visit http://localhost:5173.
Alternatively run `npm run dev:all` from this directory. Press Ctrl+C to stop.
Sign in or select Register to create an account. Existing demo login: alex@example.com / password123.

This is a browser app. Chrome or Edge can open it in a separate desktop window using their install-page-as-app or shortcut options. The local launcher must stay running.

Auction Pro also supports phone installation with a home-screen icon and standalone display. See [phone app setup](PHONE_APP.md) for HTTPS deployment and Android/iPhone installation. A production Express server serves both the built frontend and API from one origin; `render.yaml` includes a deployment configuration.

## Database

Private database URLs are in server/.env. For a fresh installation, copy server/.env.example and fill in credentials from Supabase Dashboard → Connect. DATABASE_URL is the runtime URL; DIRECT_URL is used for Prisma schema commands. Port 5432 is the session pooler; transaction pooling uses 6543 with pgbouncer=true. URL-encode special characters in passwords.

Run `npm --prefix server run db:check` to check connectivity and list actual foreign keys.
Run `npm --prefix server run db:studio` to browse tables.
The old server/prisma/dev.db SQLite file is not used.

For local PostgreSQL, start Docker Desktop, run `docker compose up -d postgres`,
and set both database URLs in `server/.env` to
`postgresql://<user>:<password>@127.0.0.1:15432/auction_db?connect_timeout=2&pool_timeout=2`
using the credentials configured for the local Compose service.
Compose exposes PostgreSQL only on localhost, using port 15432 by default to avoid
conflicts with installed database services; `POSTGRES_PORT` can override it.
Set a private random `JWT_SECRET` there as well. For a new empty local database,
run `npm --prefix server run db:deploy` once to create the tables, then start the app
with `npm run dev:all`. The backend loads `server/.env` regardless of the launch
directory and exits with a setup message if `DATABASE_URL` is missing.

| Child field | Parent field | Relationship |
| --- | --- | --- |
| Auction.sellerId | User.id | One seller has many auctions |
| Bid.bidderId | User.id | One user has many bids |
| Bid.auctionId | Auction.id | One auction has many bids |
| Watchlist.userId | User.id | One user watches many auctions |
| Watchlist.auctionId | Auction.id | One auction has many watchers |

The unique Watchlist(userId, auctionId) constraint prevents duplicates. These User records use the Express JWT login and are separate from Supabase Auth users. Existing cascade rules delete related records when a parent is deleted.

Bids, listings, purchases, and watchlists now use authenticated API requests. Failed requests display an error rather than simulating success. Buy now records a sale and purchaser; it does not process payments or transfer balances.

## Setup and verification

Prisma migrations are now versioned. Use `npm --prefix server run db:deploy` for
fresh databases and reviewed deployments, and `npm --prefix server run db:status`
to inspect migration history. The existing local database is already baselined.
See [migration and isolated-test instructions](docs/database-migrations.md).
Run `npm run test:postgres` for opt-in PostgreSQL/HTTP/Socket.IO/React workflows;
it creates and retains a separate test database and never resets working data.
The [workflow verification report](docs/auction-workflow-verification.md) records
actual test results, concurrency behavior, data preservation, and remaining limits.

Use Node 22.12+ (Node 22 in `.nvmrc`, CI, and Render; local Node 24 is also supported).
Install from both committed lockfiles, including build tools:

```
npm ci --include=dev
npm --prefix server ci --include=dev
npm run check
```

`npm run check` generates Prisma Client, lints, builds both packages, and runs all
automated tests. The tests use mocks and explicit unavailable loopback database
URLs, never the production database. GitHub Actions runs this check on PRs and
pushes to main. No seed, schema push, or migration is part of checks.

Useful commands after installation:

| Command | Purpose / prerequisites |
| --- | --- |
| `npm run lint` | Lint frontend, backend, scripts, and tests with existing Oxlint |
| `npm run build:all` | Build frontend/backend; generate Prisma Client first |
| `npm test` | Run all tests; requires Prisma generation and both builds |
| `npm run test:health` | Health tests with injected DB probes; requires backend build |
| `npm run test:context` | React/jsdom and local Socket.IO regression test; install both packages first |
| `npm run test:smoke` | Smoke CLI tests against local HTTP fixtures; only Node required |
| `npm --prefix server run check` | Generate, lint, build, and test backend; install both packages first |
| `npm run smoke -- http://localhost:4000` | Read-only liveness/readiness check against a running service |

See [operations and deployment](docs/operations.md), [QA scenarios](docs/test-plan.md),
and [actual verification results and limitations](docs/test-results.md) for AUC-XX.
`/api/health` reports process liveness; `/api/ready` checks database connectivity
with a two-second HTTP deadline. Render uses readiness. The smoke script is
manual; external continuous monitoring is not configured.

The db:seed command DELETES existing users, auctions, bids, and watchlists before adding demo data. Do not run it on existing data. Review schema changes before db:push and never accept data-loss flags blindly. Database administration is separate from automated verification; do not run it against production for the demo.

The local Vite server proxies /api and /socket.io to localhost:4000. For hosting, deploy the API and frontend with HTTPS and configure those proxy routes on your frontend host.

## Marketplace features

Sellers can open their listing from Selling and use Manage your auction. Before any bids they can cancel freely. After bids they can confirm an early sale to the highest bidder (including explicitly accepting below reserve), or cancel if the item is damaged/unavailable with a public 10–500 character reason. Cancellations do not count as wins. All bidders receive saved in-app notices, including when they next sign in; no emails or payments are sent. Confirmation rejects a changed highest bid or concurrent auction update.

The seller-control schema script is `server/prisma/seller-controls.sql`. Review database compatibility before deploying against another database; AUC-XX verification does not apply or verify remote schema changes. The script enables RLS on Notification for backend access. Run `npm --prefix server test` after generating Prisma Client and building the backend to check seller rules and health endpoints with mocks.

- Marketplace-first design in ivory and forest green, with responsive navigation and a featured listing.
- Sign-in and registration open from the header in a dialog with password visibility, keyboard focus containment, Escape dismissal, and guest browsing.
- Price, condition, buying-format, availability, and seller filters.
- Saved searches including filters and sort order, stored on this device.
- Recently viewed items, stored on this device with a clear-history option.
- Seller shops accessible from listing details.
- Account hub for watchlists, active bids, selling, and purchases/wins.
- Expired listings disable bidding; use Availability → All listings to browse past listings.
- Ending within an hour filter updates as time passes; buy-now price filters use the purchase price.
- Listing loading errors offer a retry, and reconnecting refreshes auction data.
- New listings default to three days, validate pricing, and prevent repeated publish submissions.

Run `node --experimental-strip-types tests/marketplace.mjs` for the filter checks.
Payment processing, shipping fulfillment, seller reviews, and buyer protection are not implemented.
