# Actual verification results — AUC-XX

Verification date: 2026-10-21 (user timezone Asia/Qyzylorda).
Baseline revision: `4f81092`, plus the uncommitted AUC-XX working changes.
Environment: Windows PowerShell, Node **v24.11.1**, npm **11.6.2**. CI and Render
are configured for Node 22, at least 22.12 as required by the installed Vite.
No AGENTS.md was found in the repository or available ancestor directories.
No commit, push, PR, deployment, database provisioning, or production-data
operation was performed.

## Commands and observed results

| Command / check | Actual result |
| --- | --- |
| `npm ci --include=dev` | Passed after retry with network access: 58 packages added, npm reported 0 vulnerabilities. Lockfile versions unchanged. |
| `npm --prefix server ci --include=dev` | Passed after retry with network access: 191 packages added. npm reported 5 existing dependency vulnerabilities (2 moderate, 3 high) and deprecation notices for node-domexception/uuid. |
| `npm run check` | Passed, exit 0. Prisma Client 6.19.3 generated, lint completed, both builds passed, all seven test files passed. Explicit dummy loopback DB URLs were set in the shell; the test runner overrides them again. No schema commands or real database needed. |
| `npm run lint` (inside check) | Passed with 7 warnings in pre-existing files; no lint errors or warnings in new code. See below. |
| `npm run build:all` (inside check) | Passed: frontend TypeScript/Vite 8.3.3 production build (1950 modules transformed), then backend TypeScript compilation. |
| `npm test` (inside check) | Passed: existing API response, marketplace, PWA, seller, and production routing tests; new health and smoke tests. Health: 5/5 Node tests; smoke: 19/19 tests including subtests. These counts do not count assertions in existing standalone scripts. |
| `npm --prefix server run check` | Passed independently, exit 0: Prisma generation, shared backend lint (one existing unused-catch warning), backend build, seller mock tests, and 5/5 health tests. |
| `node --test tests/smoke-check.mjs` | Passed independently with local network access: 19/19. Included actual CLI exit 0/1, default 3-second timeout, and delayed-header/body fixtures. |
| `npm --prefix server audit --json` | Exit 1: 5 vulnerable dependency entries in the existing lockfile. No automated dependency upgrades applied. |
| `git diff --check` | Passed: no whitespace errors. |

The initial sandboxed `npm ci` attempts both failed with npm's “Exit handler
never called!” error. Retrying with approved network access succeeded. An initial
sandboxed smoke test run failed its success case because local fetch returned
`EACCES`. The final suites ran with localhost access; timeout tests also assert
that the deadline actually elapsed, so an immediate connection error cannot
masquerade as a passing timeout test.

## Automated behavior actually exercised

- Liveness returns 200 without invoking a broken DB probe. Readiness waits for
  success, returns generic 503 on asynchronous and synchronous errors, and
  recovers after connectivity failure resolves.
- Hung injected DB probes return 503 within the test deadline, keep liveness
  responsive, and share one pending probe. Late rejection is handled and permits
  another probe. Production timeout is 2000 ms; unit fixtures use 40 ms to keep
  checks fast. The production-server test also observed readiness 503 with the
  actual Prisma client against an explicitly unavailable loopback database.
- Smoke CLI success performs exactly GET `/api/health` then GET `/api/ready`.
  Database 503 produces exit 1 without logging private response content.
  Invalid status/content type/JSON/body contracts, redirects, refused connections,
  credential-bearing/invalid URLs, and header/body timeouts fail. The real CLI
  default timeout was exercised at approximately 3.1 seconds on a hung fixture.
- Existing API parsing, 15 marketplace filter checks, PWA metadata/cache/offline
  checks, seller authorization/cancellation/early-sale mock rules, and production
  static/API routing checks all completed successfully.

Passing mock probes do not prove real PostgreSQL connectivity, actual transaction
rollback/concurrency, or production availability. Timing above is a local fixture
observation, not a measured production latency indicator.

## Pre-existing issues observed or identified in source

- Seven lint warnings: unused caught `err` in auth middleware; effect/state and
  hook-dependency warnings in RecentlyViewed/AuctionContext; fast-refresh export
  warning in AuctionContext. These are warnings, so checks exit 0.
- npm audit reports high-severity entries for `prisma`, `@prisma/config`, and
  `deepmerge-ts` (one advisory chain), and moderate entries for `node-cron` and
  `uuid` (another chain). These are five affected package entries, not five
  independent advisories. A dependency update needs a separate compatibility review;
  the reported node-cron fix includes a major version change. Dependencies were
  not changed by AUC-XX; only package scripts/engine metadata were updated.
- Business bid/buy/close errors may expose `Error.message`; existing database
  error logs can include internal information. The new diagnostic responses are
  generic. Broader error handling remains outside this minimal change.
- Normal expiry and Buy now infer wins from recent bid data rather than always
  persisting `winnerId`. Real bid ordering, concurrency, scheduler, and reserve
  behavior need the scenarios in the QA plan. No versioned Prisma migrations
  exist; schema compatibility needs a separate operator review.

## Not executed / limits

| Check | Status and reason |
| --- | --- |
| Manual AUTH/LIST/BID/END/BUY/WATCH/SELL/API/OUT scenarios in test-plan.md | **Not executed** — no disposable database/browser fixtures were provisioned. Source-checked expected behavior is not a manual pass. |
| Real PostgreSQL successful-readiness integration and outage/recovery drill | **Not executed** — database behavior was injected or used an unavailable loopback address; no real DB was started. |
| Production/staging smoke check | **Not executed** — no deployment target was requested; CLI was exercised against local HTTP fixtures only. |
| Render deployment, rollback, schema change, backup restoration | **Not executed** — no deployment or production mutation authorized. Operational procedures are documentation, not verified executions. |
| GitHub-hosted Actions workflow and branch-protection settings | **Not executed** — workflow added locally; no push/PR or repository-setting changes requested. Local equivalent check passed. |
| Node 22 / Ubuntu runtime | **Not executed** — available local runtime is Node 24 on Windows. CI is configured to verify Node 22 on Ubuntu after a future push. |
| Browser OAuth success, visual/mobile/accessibility/end-to-end testing | **Not executed** — requires separate browser/account/configuration sessions. Only existing invalid Google token handling was exercised. |
| Availability/latency monitoring over time | **Not executed** — no external monitor or metrics collection configured. Targets in operations.md are proposals only. |
