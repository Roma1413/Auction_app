# Verifiable QA plan — AUC-XX

This plan is checked against the current controllers, routes, scheduler, and UI.
It describes expected behavior from source inspection, **not completed manual
testing**. Execution status is in [test-results.md](test-results.md).

P0 = blocks core demo/data integrity; P1 = important regression; P2 = secondary.
Use a disposable local/staging database with the current Prisma schema, two buyer
accounts B/C and a seller S in separate browser sessions. Create uniquely named
fixtures through registration and listing APIs/UI; do not reuse production data.
Record request status/body, visible UI result, revision, and fixture IDs without
tokens/passwords. Remove fixtures only from the disposable environment. Never run
these business tests against production. The manual smoke check uses only health
GET requests and is safe to demonstrate without creating business records.

## Scenarios

| ID / priority | Steps | Expected result in this implementation |
| --- | --- | --- |
| AUTH-01 / P0 | Open Sign in → Create account. Enter a unique email, name, and password of at least 8 characters; submit. Sign out, then sign in with the same credentials. Reload. | Register/login return 200 and a JWT; `/api/auth/me` returns the profile. UI shows account; token persists locally and reload restores it. No email verification step is implemented. |
| AUTH-02 / P0 | Repeat the email; submit wrong login password; send missing required fields directly to registration/login APIs. | 400 for duplicate email, invalid credentials, or missing fields; UI displays the error and does not claim success. The UI enforces email format and registration password length; the backend currently checks presence, not full email/password-strength validation. |
| AUTH-03 / P1 | Call protected create/bid/buy/watchlist/close routes without a bearer token, then with an invalid token. | 401 JSON. Guest UI actions request sign-in; no business mutation. Google invalid-token rejection is automated; successful Google OAuth requires a separately configured client and manual validation. |
| LIST-01 / P0 | As S, use Sell an Item with title, description, category, image URL/preset, starting price 100, reserve 150, buy-now 200, and future duration. Submit once and inspect Selling. | `POST /api/auctions` returns 201; seller is S, `currentBid=100`, `bidCount=0`, `status=active`. Listing appears after save and reload. Default duration is three days; UI disables repeat submission while pending. |
| LIST-02 / P1 | Via authenticated API, try negative/non-numeric starting price, past end time, reserve below starting price, buy-now below reserve, invalid image, or negative shipping. | 400; no listing is created. UI price constraints may block some inputs before a request. Maximum six API images, each within the implemented size/format checks; request bodies over 1 MB return 413. |
| BID-01 / P0 | As B, bid 160 on LIST-01. Observe a second browser, reload B's Active bids, then bid equal to/lower than current price. | Successful bid returns 200, creates bid and increments count/current price; Socket.IO updates connected clients. Equal/lower/non-positive/non-finite bids return 400. UI suggests +50 below 1000, +250 otherwise; API only requires strictly greater than current price. |
| BID-02 / P0 | As S, submit a bid above the current price on S's own listing directly to `POST /api/auctions/:id/bid`. | 400 with own-auction rejection; no bid/count/price change. Test a high enough amount to reach the ownership guard. UI is not the authorization boundary. |
| BID-03 / P1 | As B/C, submit competing bids on the same current price concurrently. | Guarded transaction permits only a valid update against its observed price; a stale update returns 400 and rolls back its inserted bid. Verify persisted bids and count; existing mock seller tests do not prove real PostgreSQL concurrency behavior. |
| END-01 / P0 | Create a 5-minute listing, place a bid meeting reserve, and wait past expiry (or create an API listing ending shortly). Try bid/buy/close immediately after expiry, then wait for the scheduler tick. Use Availability → All listings. | Backend rejects late actions with 400 even before scheduler runs; UI bidding is disabled by wall clock. Scheduler runs every ten seconds and changes active to ended. Highest qualifying bidder appears in Purchases & wins; expired listings are excluded from default active view. |
| END-02 / P1 | Repeat expiry with no bids and with highest bid below reserve. | Ended status; no qualifying win. Scheduler emits no winner. Normal expiry does not persist `winnerId`; UI infers a qualifying winner from bid order/reserve. Live expiry notices are not durable seller-action notifications. |
| BUY-01 / P0 | As B, choose Buy now on an active future listing priced 200. Reload Purchases & wins; try purchase again and attempt another bid. | 200 sale: `status=sold`, current price equals buy-now price, a purchase bid is recorded and bid count increments. Repeat/late bid returns 400. No payment, shipping fulfillment, or balance transfer occurs. Buy-now does not set `winnerId`; the UI derives buyer from the newest bid. |
| BUY-02 / P0 | As S, directly call own listing's buy-now route. As B, try a listing without buy-now or an expired/cancelled listing. | 400; no sale or purchase bid. Nonexistent purchase ID currently also returns 400, while nonexistent listing GET returns 404. |
| WATCH-01 / P1 | As B, save a listing using the heart, open Watchlist, reload/sign in again, remove it, then inspect from C's account. | Toggle API returns 200 with `watched: true/false`; saved IDs persist in B's profile, unique by user/listing. C has an independent list. Missing token gives 401. Invalid auction ID currently returns generic 500, not a dedicated 404. |
| SELL-01 / P0 | As S, open Selling → listing → Manage your auction. Cancel a no-bid listing, confirm, reload; try again. | Status cancelled, no winner/win. No reason required before bids. Duplicate closure returns 400; other users cannot close it (400); missing token gives 401. UI hides controls for other sellers. |
| SELL-02 / P0 | Add bids from B/C. As S, cancel first with fewer than 10 trimmed characters, then a 10–500 character damaged/unavailable reason. Sign in as bidders again. | Invalid reason gives 400; valid cancellation sets cancelled and public reason, with no winner. Each distinct bidder gets one saved in-app notification; notifications reload on sign-in/polling. No email is sent. |
| SELL-03 / P0 | With bids, choose Accept highest bid & end auction. Review buyer/price, including below-reserve warning, confirm. Repeat with C placing a new highest bid after the confirmation dialog opens. | Valid confirmation sets sold, `winnerId`, and `closureType=accepted-highest`; highest bidder wins even below reserve, and bidders receive saved notices. Changed expected bid/concurrent update gives 400 and requires refresh/review. Cannot close expired/sold/cancelled listings. |
| API-01 / P1 | GET `/api/not-a-route`; GET nonexistent auction; POST malformed JSON to login; POST >1 MB JSON to create. | Respectively 404 JSON, 404 JSON, 400 JSON, 413 JSON. Frontend API reader rejects HTML gateway pages and malformed success bodies; existing API-response test covers those cases. |
| OUT-01 / P0 | In disposable environment stop DB while leaving app running; check health/ready and run smoke. Restore DB and retry. | Liveness 200; readiness 503 by 2-second HTTP deadline (plus scheduling/network overhead); smoke exits 1. After probe settles/connectivity recovers, readiness 200 and smoke 0. Automated tests simulate this; no real outage drill has been executed here. |
| OUT-02 / P1 | Stop local backend or block its API in browser; try loading listings, bid/buy/watchlist/create; restore backend and retry/reconnect. | Listing load error offers Retry; requests display failure rather than local fake success; socket disconnect changes connection state, reconnect refreshes listings. Inspect persisted state before retrying an ambiguous mutation. DB errors currently use route-specific 400/500, not uniform 503. |

## Automated coverage and limits

Run `npm run check` after installing both packages. Existing tests cover API response
parsing, 15 marketplace filter assertions, PWA assets/cache rules, production
static/API routing, and seller close rules with mocked transactions. New health
tests use a real local Express listener and injected successful, failed, hung,
and recovering probes. Smoke tests exercise the CLI and local HTTP fixtures for
success, 503, invalid payloads/statuses/content types/redirects, connection refusal,
and both header/body timeouts. No browser automation or real PostgreSQL business
integration suite is included.

Known source-level limits to keep visible during manual testing:

- Seller cancellation/early sale are implemented; general listing edit/delete,
  payment processing, refunds, delivery, reviews, and buyer protection are not.
- Live auction lists load at most ten recent bids per item. The dashboard infers
  normal expiry/buy-now winners from recent bid order; complex bid histories need
  explicit testing and are not proven by the health/seller mock suites.
- Some bid/buy/close controller catches return raw `Error.message`, and existing
  logs may contain internal database details. The new health and smoke responses
  are sanitized; this change does not fix all existing business-route error handling.
- Scheduler behavior, real transactions, reserve/winner UI behavior, durable
  watchlist persistence, and all browser flows above require manual or isolated
  integration verification. A source review is not a passed test.
