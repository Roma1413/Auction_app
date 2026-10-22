import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { validateDatabaseConfiguration } from '../server/dist/config.js';

test('database configuration rejects missing and blank URLs with an actionable message', () => {
  for (const DATABASE_URL of [undefined, '', '  ']) {
    assert.throws(() => validateDatabaseConfiguration({ DATABASE_URL }), /DATABASE_URL is missing.*server\/\.env.*docker compose/);
  }
  assert.doesNotThrow(() => validateDatabaseConfiguration({ DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/auction_test' }));
  assert.doesNotThrow(() => validateDatabaseConfiguration(), 'Externally supplied environment variables remain usable');
});

test('missing configuration exits before starting the scheduler from either launch directory', async () => {
  const entry = fileURLToPath(new URL('../server/dist/index.js', import.meta.url));
  for (const directory of ['../', '../server/']) {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [entry], {
        cwd: fileURLToPath(new URL(directory, import.meta.url)),
        env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: '', DIRECT_URL: '', JWT_SECRET: 'test-only' },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        timeout: 5000,
      });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { output += chunk; });
      child.on('error', reject);
      child.on('close', (code, signal) => resolve({ code, signal, output }));
    });
    assert.equal(result.code, 1);
    assert.equal(result.signal, null, 'Startup must exit itself without waiting for the scheduler');
    assert.match(result.output, /DATABASE_URL is missing/);
    assert.doesNotMatch(result.output, /Starting background|Scheduler error|Backend Server running|PrismaClientInitializationError/);
  }
});
