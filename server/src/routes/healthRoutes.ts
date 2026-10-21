import { Router } from 'express';

export const READINESS_TIMEOUT_MS = 2000;

// Inject the probe so tests never need a database or the application scheduler.
export function createHealthRouter(checkDatabase: () => Promise<unknown>, timeoutMs = READINESS_TIMEOUT_MS) {
  const router = Router();
  let pendingProbe: Promise<unknown> | undefined;

  router.use(['/health', '/ready'], (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/ready', async (_req, res) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Share a pending query: repeated probes cannot accumulate DB work during an outage.
      // Prisma does not cancel a raw query when the HTTP deadline expires.
      if (!pendingProbe) {
        pendingProbe = Promise.resolve().then(checkDatabase);
        void pendingProbe.then(
          () => { pendingProbe = undefined; },
          () => { pendingProbe = undefined; },
        );
      }
      await Promise.race([
        pendingProbe,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Readiness timeout')), timeoutMs);
        }),
      ]);
      res.json({ status: 'ready', database: 'connected' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    } finally {
      clearTimeout(timer);
    }
  });

  return router;
}
