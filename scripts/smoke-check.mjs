import { pathToFileURL } from 'node:url';

export const SMOKE_TIMEOUT_MS = 3000;

export async function smokeCheck(baseUrl, { timeoutMs = SMOKE_TIMEOUT_MS } = {}) {
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password ||
      base.pathname !== '/' || base.search || base.hash) {
    throw new Error('Use an HTTP(S) origin without credentials, path, query, or fragment');
  }

  for (const [path, status] of [['/api/health', 'ok'], ['/api/ready', 'ready']]) {
    try {
      const response = await fetch(new URL(path, base), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status !== 200 || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
        await response.body?.cancel();
        throw new Error('Invalid HTTP response');
      }
      const body = await response.json();
      if (!body || body.status !== status || (path === '/api/ready' && body.database !== 'connected')) {
        throw new Error('Invalid health response');
      }
    } catch {
      // Do not echo the URL, response body, or network errors (which may contain credentials).
      throw new Error(`${path} failed: expected healthy JSON within ${timeoutMs} ms`);
    }
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length !== 1) {
    console.error('Usage: npm run smoke -- http://localhost:4000');
    return 1;
  }
  try {
    await smokeCheck(args[0]);
    console.log('Smoke check passed: liveness and database readiness.');
    return 0;
  } catch {
    console.error('Smoke check failed. Check the base URL, service, and database readiness.');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
