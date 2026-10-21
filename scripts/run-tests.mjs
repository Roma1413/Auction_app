import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const groups = {
  frontend: ['api-response', 'marketplace', 'pwa'],
  backend: ['seller-controls', 'health'],
  integration: ['pwa-server'],
  health: ['health'],
  smoke: ['smoke-check'],
};
const group = process.argv[2] || 'all';
const tests = group === 'all' ? [...groups.frontend, ...groups.backend, ...groups.integration, ...groups.smoke] : groups[group];
if (!tests) throw new Error(`Unknown test group: ${group}`);

// Override inherited values BEFORE importing application modules or starting child servers.
// No tests require a real DB. Port 1 is deliberately unavailable; never read remote .env URLs.
const databaseUrl = 'postgresql://test:test@127.0.0.1:1/auction_test?connect_timeout=1&pool_timeout=1';
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  JWT_SECRET: 'local-automated-test-secret-only',
  GOOGLE_CLIENT_ID: 'automated-test.apps.googleusercontent.com',
};
for (const test of tests) {
  console.log(`\nRunning ${test}`);
  const result = spawnSync(process.execPath, [
    '--experimental-strip-types',
    ...(test === 'health' || test === 'smoke-check' ? ['--test'] : []),
    `tests/${test}.mjs`,
  ], { cwd: root, env, stdio: 'inherit', windowsHide: true, timeout: 60000 });
  if (result.error) console.error(`Could not complete ${test}: ${result.error.code || 'process error'}`);
  if (result.error || result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
