# Google sign-in setup

1. Create a Web application OAuth client in Google Cloud, configure its consent screen, and add your frontend origin under Authorized JavaScript origins (for example `http://localhost:5173`, plus your production origin). See [Google's setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
2. Copy the client ID into `VITE_GOOGLE_CLIENT_ID` in the root `.env` and `GOOGLE_CLIENT_ID` in `server/.env`. Both values must match. No client secret is needed for this flow.
3. Apply `server/prisma/google-sign-in.sql` to the database, then run `npm run db:generate` in `server`. Alternatively use your normal Prisma schema deployment process.
4. Restart the frontend and backend. Open Sign in and choose Continue with Google. New users get an account automatically. Existing Gmail and Google Workspace accounts are linked by verified email; other existing accounts must use their password.

The server verifies the token signature, audience, issuer, and expiration with Google's auth library before issuing an Auction session. Google accounts are identified by their stable subject ID. Existing account balances, bids, and watchlists are preserved.
