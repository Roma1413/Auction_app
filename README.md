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

```
npm install
npm --prefix server install
npm --prefix server run db:generate
npm run build
npm --prefix server run build
npm --prefix server run db:check
```

The database is already populated. The db:seed command DELETES existing users, auctions, bids, and watchlists before adding demo data. Do not run it on existing data. Review schema changes before db:push and never accept data-loss flags blindly.

The local Vite server proxies /api and /socket.io to localhost:4000. For hosting, deploy the API and frontend with HTTPS and configure those proxy routes on your frontend host.

## Marketplace features

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
