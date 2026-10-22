# Operations baseline — AUC-XX

This application uses a Vite/React frontend, one Express/Socket.IO backend with
an in-process auction scheduler, and PostgreSQL through Prisma. Render serves
the frontend and API from the same backend process. Docker Compose supplies
only a local PostgreSQL 16 database. No architecture change is required.

## Environment and prerequisites

- Use Node 22 (at least 22.12), matching `.nvmrc`, CI, and Render. Local Node 24
  is also supported by the package engine declarations. Existing utility tests
  import TypeScript directly; the test runner supplies `--experimental-strip-types`.
- Install both packages with their committed lockfiles, including development
  dependencies: TypeScript, Vite, Prisma CLI, and Oxlint are build prerequisites.
- Copy `server/.env.example` to `server/.env` for local development and replace
  placeholders privately. Never commit `.env` files or paste their contents into logs.

| Variable | Purpose / example without real credentials |
| --- | --- |
| `DATABASE_URL` | Runtime PostgreSQL URL, e.g. `postgresql://<user>:<password>@127.0.0.1:15432/auction_db?connect_timeout=2&pool_timeout=2` for Compose only |
| `DIRECT_URL` | Direct/session URL for reviewed Prisma schema administration; use the same local URL for Compose |
| `JWT_SECRET` | Unique random private secret; required for production startup |
| `PORT` | Local default `4000`; Render supplies its port |
| `POSTGRES_PORT` | Compose host port, default `15432`; bind is restricted to `127.0.0.1` |
| `NODE_ENV` | `production` to serve the built frontend from Express |
| `GOOGLE_CLIENT_ID` | Optional public Google web client ID for backend token verification |
| `VITE_GOOGLE_CLIENT_ID` | Matching public client ID baked into the frontend build; never put a secret in `VITE_*` |

Supabase runtime pooling may require `pgbouncer=true`; use the provider's
connection details and TLS settings. Keep runtime and schema-admin credentials
distinct where possible. Set short PostgreSQL connection/pool timeouts (for
example `connect_timeout=2&pool_timeout=2`). Readiness bounds its HTTP response,
but cannot cancel Prisma's underlying query. Consider a database-role
`statement_timeout` through the database administrator for bounded SQL execution.

## Install, check, build, start

From the repository root:

```sh
npm ci --include=dev
npm --prefix server ci --include=dev
npm run check
```

`check` generates Prisma Client, lints frontend/backend/scripts/tests, builds both
packages, and runs all default test files. `npm test` alone requires generated
Prisma Client and **both builds already present**. `npm run test:health` requires
the backend build; `npm run test:smoke` needs only Node. `npm --prefix server run
check` generates the client, lints/builds the backend, and runs seller, health,
scheduler, and Prisma-config tests;
it also requires the root dependencies for the shared linter. `npm run test:context`
uses jsdom and the existing backend tsx loader to exercise React state and a local
Socket.IO server without a database.

Checks never provision schemas or seed data. The test runner overrides inherited
database URLs with an unavailable loopback address before loading application
modules. Seller tests mock Prisma transactions; health tests inject DB probes;
the production routing test starts a local process with the same loopback URL.
The scheduler in that process cannot reach any remote database. These tests do
not require a PostgreSQL CI service. Future real database tests must use a fresh,
isolated CI PostgreSQL service and test-only URLs, never production secrets.

For development with a separately configured development database:

```sh
docker compose up -d postgres
npm --prefix server run db:generate
npm run dev:all
```

Compose's named volume persists data and does not apply the Prisma schema. For
a **new disposable local database only**, an operator may explicitly initialize
it with `npm --prefix server run db:deploy` after verifying both URLs point to that
local database. This is not part of checks, deployment, or the smoke script.
Never use seed, schema push, or ad hoc migration commands on an existing remote
database. The seed script deletes data. No database initialization was performed
as part of AUC-XX verification.

The current local database now has a validated initial Prisma migration baseline.
Normal deployments use `db:deploy` and `db:status`, without resetting existing
tables. The opt-in `npm run test:postgres` creates a separate, retained local
test database, deploys migrations there, and exercises the real API, sockets,
and React context. See [database migrations](database-migrations.md) for safety
guards, baseline commands, and retained test-data handling.

For production-style local startup, build first with `npm run build:all`, set
`NODE_ENV=production` and a unique `JWT_SECRET` using your shell/environment, then
run `npm --prefix server start`. Frontend files come from root `dist/`; backend
files come from `server/dist/`. Development uses port 5173 with API/socket proxy
to port 4000.

## Health contract and manual smoke check

| Endpoint | Success | Failure / meaning |
| --- | --- | --- |
| `GET /api/health` | `200 {"status":"ok"}` | Process/HTTP route liveness only; no DB access |
| `GET /api/ready` | `200 {"status":"ready","database":"connected"}` | `503 {"status":"unavailable"}` on DB failure or the 2-second deadline |

Both responses use `Cache-Control: no-store`. Readiness executes only `SELECT 1`.
It shares any pending probe until it settles, preventing overlapping raw queries
from repeated requests after a timeout. A permanently stuck query needs driver
timeout or process recovery; HTTP deadlines do not cancel it. Deadlines also
depend on a responsive Node event loop. Successful readiness verifies connectivity,
not schema compatibility, auction scheduling correctness, or every business route.

```sh
npm run smoke -- http://localhost:4000
npm run smoke -- https://YOUR-SERVICE.onrender.com
```

Supply an origin without path, credentials, query, or fragment. The script sends
only two GET requests, validates HTTP 200 and the JSON contract, rejects redirects,
and allows 3 seconds per request including body reading. It exits 0 on success
and 1 on invalid input, network failure, unhealthy service, or invalid response.
It does not log response bodies or credentials, create business records, or call
the auction-detail route (which increments a view counter).

## Render deployment procedure

1. Review the diff and run `npm run check`. Use a separate staging environment
   for the business scenarios in [test-plan.md](test-plan.md).
2. Use the existing `render.yaml` Blueprint for the Node web service. The build
   command installs both lockfiles, generates Prisma Client, and builds both
   packages. Startup remains `npm --prefix server start`; Node remains 22.
3. Configure `DATABASE_URL` and `DIRECT_URL` privately in Render (`sync: false`).
   Render generates `JWT_SECRET`; Google IDs are public identifiers. Verify the
   target database schema is already compatible through a separately reviewed
   schema-change process. There is no versioned Prisma migration history here;
   SQL files in `server/prisma/` require operator review before use elsewhere.
4. Deploy the reviewed revision using your Render workflow. The health check
   now uses `/api/ready`; `/api/health` is deliberately independent of DB health.
   A database outage can therefore prevent a new deployment from becoming healthy.
5. Run the smoke command against the deployed HTTPS origin and confirm frontend
   loading and socket reconnection in a browser. Record revision/time/results.

These are instructions for an operator; this issue does not deploy anything.
The workflow runs on PRs and pushes to main. Required branch checks must be enabled
separately in GitHub repository settings. A hosted CI run has not been verified locally.

## Outage troubleshooting

**No liveness response:** check Render service state, startup/build logs, configured
port and JWT secret, and the last deploy. Rebuild both packages if static files
are missing. Check DNS/TLS/proxy reachability separately from process health.
Inspect logs privately; existing controller/scheduler error logs can include
database details and should be redacted before sharing. A restart is an operator
action, not something the smoke script performs.

**Liveness 200, readiness 503:** check provider database status, URL/TLS/credentials,
network access, connection limits, and pool/connect timeouts. Do not print the
URL or repeatedly restart healthy app instances during a database outage. Once
connectivity recovers, retry readiness; a settled failed probe allows a fresh
check. If an underlying query remains permanently pending, investigate the
database/driver and restart the application only after addressing the cause.

**Readiness 200, business routes fail:** inspect sanitized application logs and
schema compatibility, authentication, and request payloads. `SELECT 1` can succeed
when tables/columns are missing. The auction scheduler runs every ten seconds
and writes expiry status, so do not start the normal app against production just
to test an outage. Use a disposable local/staging database for outage drills.

**Ambiguous bid/purchase response:** refresh and inspect the listing/account
before retrying. A lost response does not prove the transaction failed.

## Application rollback

Record the failed revision and last known working revision. In Render, select
the known working deploy's rollback option if available, or manually deploy the
known working Git revision without rewriting history. Confirm its environment,
build, readiness, smoke result, and browser loading. Keep the JWT secret stable
unless intentionally invalidating sessions. Check Render's service settings for
automatic deploy behavior so the failed revision is not immediately redeployed.

An application rollback does **not** revert the database. This issue changes no
schema. For future schema changes, prefer backward-compatible expand/contract
steps; confirm the older application supports the current schema before rollback.
Destructive/renamed columns may make rollback unsafe. Use a reviewed forward fix
or a coordinated restore from a tested backup/PITR plan; restoration may lose
newer data and requires its own authorization. Never seed or force schema push as
a rollback. Backup restoration and Render rollback have not been exercised here.

## Dependency maintenance

The backend retains Prisma 6 and scopes a `deepmerge-ts: 8.0.2` override to
`@prisma/config`. The [security advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
identifies 8.0.0 as the patched line. This avoids changing the Prisma major version
or schema architecture. A regression test loads a real Prisma TypeScript config,
checks nested merging, and exercises recursive inputs. Revisit the override when
the maintained Prisma dependency range includes the patched library; do not
remove it just because a normal install succeeds.

`node-cron` is updated to 4.6.0, removing its vulnerable uuid dependency. Its
[v3-to-v4 migration guide](https://www.nodecron.com/migrating-from-v3.html) confirms
the default import and automatically starting `schedule` API used here remain
available. The application still uses `*/10 * * * * *`. The scheduler now returns
its task handle for lifecycle testing; existing startup callers can ignore it.
Types ship with v4, so the old `@types/node-cron` package is removed.

The React regression fixture uses jsdom 26.1 with the existing tsx loader and
real React/Socket.IO code. It is a development dependency and does not ship in
the frontend bundle. npm may still print deprecation notices for transitive
`whatwg-encoding` (jsdom) and `node-domexception` (Google authentication).
Deprecations and vulnerability advisories are separate; audit results describe
the advisories available at verification time, not a permanent security guarantee.

## Proposed indicators (not measured service results)

| Proposed indicator | Definition | Initial proposed target |
| --- | --- | --- |
| Ready availability | Successful external readiness checks / scheduled checks over 30 days, counting failures/timeouts | 99.0% |
| Readiness latency | External `/api/ready` latency, successful samples, p95 over 24 hours; track timeout rate separately | p95 < 1000 ms |
| API latency | Server or external latency of representative listing requests, p95 over 24 hours, with error rate alongside it | p95 < 1000 ms; 5xx < 1% |

These are discussion targets for the pre-defense, not an SLA or achieved values.
There is no configured external continuous monitor, metrics store, dashboard,
on-call alert, or collected baseline in this change. CI is event-triggered;
the smoke script is manual. Render's configured readiness probe is a platform
health mechanism, not evidence of measured end-user availability. Free-plan
sleep/cold starts and database/provider outages may affect these targets.
