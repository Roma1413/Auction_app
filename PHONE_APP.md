# Install Auction Pro on your phone

Auction Pro has an app manifest, Android icons, an iPhone home-screen icon, standalone display, an Install Auction Pro button in the footer, and a service worker for an offline connection screen. Live prices, bids, sign-in, and account data require a connection and are never served from the service-worker cache.

## Put it online with HTTPS

The Node/Express backend runs WebSockets and a background auction scheduler. Deploy the frontend and backend together as a Node web service; a static-only host will not run live bidding. The included `render.yaml` prepares this deployment on Render.

1. Put this repository in your GitHub account. Keep `.env` and `server/.env` private; they are ignored by Git.
2. In [Render](https://dashboard.render.com/), create a Blueprint from that repository. Review the service plan before deploying.
3. Set `DATABASE_URL` and `DIRECT_URL` from your private `server/.env` in Render's environment settings. The blueprint generates a new `JWT_SECRET` and supplies the Google client ID. Never paste database credentials into frontend variables.
4. Deploy. Render builds both parts, generates Prisma, and starts Express. The Google-account database update has already been applied to the configured database. For a different database, apply `server/prisma/google-sign-in.sql` and `server/prisma/protect-account-tables.sql` through your database administration workflow.
5. Copy the exact HTTPS origin Render assigns, such as `https://your-service.onrender.com`. Add it to **Authorized JavaScript origins** on your existing Web application client in [Google Auth Platform](https://console.cloud.google.com/auth/clients). Keep localhost entries for development. Redirect URIs remain empty for this popup flow.
6. Open the HTTPS link on your phone and sign in to test your account and live listings before installing.

Render's free services can sleep and restart. Auction completion checks only run while the server is awake. Choose an always-on service before relying on continuous auction timing. Read [Render's free-service limits](https://render.com/docs/free) and [Node deployment guide](https://render.com/docs/deploy-node-express-app).

## Install

- Android: open the HTTPS link in Chrome, then tap **Install Auction Pro** in the app footer. If no prompt appears, use the browser menu → **Install app** or **Add to Home screen**.
- iPhone/iPad: open the link in Safari, tap **Share → Add to Home Screen**, and enable **Open as Web App** if offered.

The icon opens Auction Pro in its own window. Installation does not require an app-store listing or keep your computer running once deployed.

## Check the production build locally

Run `npm run build` and `npm --prefix server run build`, then start the server with `NODE_ENV=production`, a unique `JWT_SECRET`, and a free `PORT` in your shell. Express serves `dist/`, `/api`, and `/socket.io` from one origin. Service workers register in production builds only, so normal Vite development does not get cached.

To regenerate icon assets on Windows, run `powershell -File scripts/create-app-icons.ps1`. The checked-in PNGs are ready for deployment.
