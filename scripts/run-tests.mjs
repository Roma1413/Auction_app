import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const groups = {
  frontend: ['api-response', 'marketplace', 'pwa', 'auction-context'],
  backend: ['server-config', 'seller-controls', 'health', 'scheduler', 'prisma-config', 'postgres-isolation'],
  integration: ['pwa-server'],
  health: ['health'],
  smoke: ['smoke-check'],
  context: ['auction-context'],
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
  TSX_TSCONFIG_PATH: fileURLToPath(new URL('../tsconfig.app.json', import.meta.url)),
};
const totals = { tests: 0, pass: 0, fail: 0, skipped: 0, files: 0, interrupted: 0 };
for (const test of tests) {
  console.log(`\nRunning ${test}`);
  const result = spawnSync(process.execPath, [
    '--experimental-strip-types',
    '--test', '--test-reporter=spec',
    ...(test === 'auction-context' ? ['--import', './server/node_modules/tsx/dist/loader.mjs'] : []),
    `tests/${test}.mjs`,
  ], { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  totals.files++;
  for (const field of ['tests', 'pass', 'fail', 'skipped']) {
    const match = result.stdout?.match(new RegExp(`ℹ ${field} (\\d+)`));
    if (match) totals[field] += Number(match[1]);
  }
  if (result.error) {
    totals.interrupted++;
    console.error(`Could not complete ${test}: ${result.error.code || 'process error'}`);
  }
  if (result.error || result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
console.log(`Test totals: ${totals.pass} passed, ${totals.fail} failed, ${totals.skipped} skipped; ${totals.tests} test cases across ${totals.files} files; ${totals.interrupted} interrupted files.`);
