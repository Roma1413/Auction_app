# Auction workflow verification — 23 October 2026

## Migration baseline and preservation

`20261023000000_initial` reproduces the current five application tables,
indexes, and foreign keys. It was deployed to fresh isolated databases, followed
by successful `migrate status` and schema comparisons reporting no differences.

The working `auction_db` was then marked baselined with `migrate resolve
--applied`; its application DDL was not replayed. The migration checksum matches
the migration SQL file and migration history is up to date. Row counts and
SHA-256 hashes for `User`, `Auction`, `Bid`, `Watchlist`, and `Notification` are
identical before and after testing. This development database contained zero rows
in those tables and still does; no synthetic records were added to it.

No database reset, data deletion, seed operation, container replacement, or volume
removal was performed. Existing unrelated project changes were preserved. No
application controller, authentication setting, or API contract was changed.

Future deployment commands and one-time baseline guidance are documented in
[database migrations](database-migrations.md). Normal deployments use:

```sh
npm --prefix server run db:generate
npm --prefix server run db:deploy
npm --prefix server run db:status
```

## Actual results

| Check | Result | Evidence |
| --- | --- | --- |
| Lint | PASS | `npm run lint` |
| Both builds | PASS | `npm run build:all` |
| Default suite | PASS | 37 passed, 0 failed, 0 skipped across 12 files in the delivered snapshot |
| Isolated PostgreSQL suite | PASS | 23 passed, 0 failed, 0 skipped |
| Schema reproducibility | PASS | Fresh `migrate deploy` succeeds; schema diff is empty |
| Registration/login | PASS | Four synthetic accounts registered through the API; bcrypt storage, duplicate/missing credentials, valid/invalid login, and sanitized profiles checked |
| Logout/authorization | PASS | Actual React logout removes the token and resets the account; missing, tampered, and expired JWTs are rejected |
| Listing/deadline/browsing | PASS | Seller ownership comes from the JWT; configured future deadline persists; public browsing and filtering work; invalid listing inputs are rejected |
| Valid/invalid bids | PASS | Valid bid commits; lower, equal, invalid, anonymous, and seller self-bids are rejected without changing committed counts |
| Concurrent bids | PASS | Final run: six simultaneous requests, one accepted and five rejected; current price 250, two total committed bid rows including the preceding bid. No orphan rows or price regression |
| Real-time updates | PASS | Two real Socket.IO clients receive committed updates; an unauthenticated socket cannot use the legacy bid event to write bids |
| Reconnection | PASS | Disconnected observer reloads canonical state; the real React context restores selected-auction state after restarting its isolated backend |
| Deadline/winner | PASS | Highest valid bid of 130 announced; expired bids rejected; no-bid and below-reserve auctions announce no winner |
| Buy now | PASS | Seller purchase and repeated/post-sale actions rejected; two simultaneous buyers produce one purchase and one rejection |
| Seller controls | PASS | Ownership, stale highest-bid review, early acceptance, cancellation reason, retained bid history, and persisted bidder notifications checked |
| PostgreSQL constraints | PASS | Real foreign keys and watchlist uniqueness reject invalid/duplicate inserts through Prisma |
| Working app readiness | PASS | Backend and proxied frontend readiness endpoints report connected PostgreSQL after all testing |

Final delivery suites total **60 passed, 0 failed, 0 skipped**. Counts follow Node's test
reporter: the PostgreSQL total includes its parent test; legacy assertion-only
files in the default suite each count as one file case. The earlier local total
of 61 included one unrelated mobile-navigation test. That test and the associated
UI edits remain local and are excluded from this database delivery. Earlier
validation runs and the targeted safety-guard rerun are not added again.

For delivery, lint, both builds, and the default suite were run against an export
of the exact staged code. PostgreSQL workflows ran from the working directory
using its private configuration in place, after verifying that the tested source
and built backend match the staged snapshot. No private environment file was copied.
The sandbox initially blocked the default suite's local socket fixture; its rerun
with local networking access passed. No application change was required.

The final expiry sample was observed approximately 9.1 seconds after its configured
deadline, within the scheduler's ten-second polling interval. The API rejects
late bids using the deadline even before the scheduler updates stored status.

Concurrent requests that lose the conditional update return HTTP 400 with a
refresh/retry message. They are not silently accepted or automatically retried.
The invariant checked is that the stored price equals the highest **accepted**
bid, with bid count equal to committed bid rows. Earlier runs accepted different
numbers of racing requests; all maintained those invariants.

## Isolation and scope

`npm run test:postgres` creates a fresh local `auction_test_<random hex>` database,
deploys migrations, and launches the actual backend on an ephemeral port. It uses
the real HTTP routes, Prisma, PostgreSQL, Socket.IO, and React context. Production
mode is used only in that child process to exercise static frontend serving; its
database and JWT key are isolated. Working ports 4000/5173 are not restarted.

Passwords and JWT keys are generated at runtime and kept in memory. No tokens or
test passwords are written to source or result metadata. Failure assertions avoid
displaying password material. The runner rejects remote URLs, port 5432, the
working database, and names outside its generated test namespace.

Four isolated databases from validation and delivery runs were retained for inspection;
none was dropped. The latest run contains four users, eight auctions, and fourteen
bids. The latest database name and metrics are in ignored `node_modules/.cache/auction/` metadata;
cleanup requires explicit approval. No production database was accessed.

These are automated API/Socket.IO end-to-end and React integration tests, not a
new browser-click automation suite. Google OAuth and external payment services
were not exercised.

## Remaining pre-defense limitations

- Logout is client-side. A copied JWT remains valid until expiry; server-side
  revocation is not implemented. The test explicitly demonstrates this boundary.
- Automatic expiry selects and announces the correct tested winner but leaves
  `winnerId` null. Buy-now also relies on bid history; seller early acceptance
  persists `winnerId`. A consistent persisted winner/audit model remains work.
- Expiry status changes can lag the deadline by up to the ten-second scheduler
  interval. The observed deadline test passed without any scheduler error.
- Buy now records a sale and buyer; it does not charge money, transfer balances,
  or provide shipping/payment fulfillment.
- Registration policy validation and abuse protection need a separate hardening
  review; the inspected password endpoint checks required fields, while the UI
  supplies additional validation. Google sign-in requires a separate live test.

No missing feature was implemented, and no confirmed core-workflow failure
required changing application behavior during this task.
