# Database migrations and isolated integration tests

The initial migration is `server/prisma/migrations/20261023000000_initial`.
It creates the five application tables, indexes, and foreign keys described by
`server/prisma/schema.prisma`. Do not edit an already applied migration.

The existing local `auction_db` was baselined using Prisma 6's supported
[baseline workflow](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/baselining).
The migration was first deployed to an empty isolated database and compared to
the schema. Only then was `migrate resolve --applied 20261023000000_initial`
used on `auction_db`. No application DDL was replayed there. All five application
tables retained identical row hashes. `_prisma_migrations` is additional metadata.

## Fresh installation and future deployments

Configure private `DATABASE_URL`, `DIRECT_URL`, and `JWT_SECRET` in `server/.env`
or the deployment environment. Never commit them. From the project root:

```sh
npm ci --include=dev
npm --prefix server ci --include=dev
npm --prefix server run db:generate
npm --prefix server run db:deploy
npm --prefix server run db:status
npm run build:all
```

For local Compose development, start Docker Desktop and run
`docker compose up -d --wait --wait-timeout 30 postgres` first. The service uses
localhost port 15432 by default. Production deployments run `db:deploy` against
their explicitly selected target after reviewing pending migration SQL and
arranging a database backup. Deployment does not generate a new migration.

For an **existing unmanaged database**, inspect its target and application tables
and verify that the schema equals this baseline before marking it applied. From
`server/`, the one-time command is:

```sh
npx prisma migrate resolve --applied 20261023000000_initial
```

Do not use this command to hide schema drift. It was already completed for the
current local database. `db:push` is no longer the normal deployment workflow.
Never run `migrate reset` on the working database. Create future migrations only
against a separate disposable development database and review their SQL.

## Automated checks

```sh
npm run lint
npm run build:all
npm test
npm run test:postgres
```

`npm test` remains independent of a real database. Its runner now prints aggregate
test counts; legacy assertion-based test files are each counted as one Node test
file case. `postgres-isolation` verifies the database safety guards without
connecting to PostgreSQL.

`test:postgres` is explicitly opt-in and requires both builds, installed backend
development tools, and a healthy local Compose `auction-postgres` container. It:

1. Verifies the expected Compose project, existing data volume, and localhost port.
2. Reads private local connection settings without displaying credentials.
3. Creates a fresh `auction_test_<24 random hexadecimal characters>` database.
4. Runs `migrate deploy`, `migrate status`, and a read-only schema comparison.
5. Starts a separate backend on an ephemeral port with a random, in-memory JWT key.
6. Registers synthetic accounts through the real API with random passwords kept
   only in memory, then exercises HTTP, Prisma, PostgreSQL, Socket.IO, and React.
7. Stops only its own backend. It never drops a database, truncates tables, or
   seeds/changes the working `auction_db`.

The safety guards reject remote hosts, native PostgreSQL port 5432, the working
database, and database names outside the generated namespace. Local credentials
are required to have `CREATE DATABASE` permission. No production URL is accepted.

The isolated database is **retained for inspection**, including synthetic users,
listings, bids, and migration metadata. Deleting it requires explicit approval;
there is intentionally no automatic cleanup. The last run's database name,
counts, and metrics are in ignored `node_modules/.cache/auction/` files. They do
not contain passwords or tokens. Repeated runs create distinct databases.

The workflow suite performs API/Socket.IO end-to-end tests and mounts the actual
React context against that backend for authentication, logout, and server-restart
reconnection. It does not automate a browser or execute payment transactions.
