import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../server/package.json', import.meta.url));
export const { Client } = require('pg');
const dotenv = require('dotenv');

export function localDatabaseEnvironment() {
  const env = dotenv.parse(readFileSync(new URL('../../server/.env', import.meta.url)));
  let runtime, direct;
  try { runtime = new URL(env.DATABASE_URL); direct = new URL(env.DIRECT_URL); }
  catch { throw new Error('Invalid local PostgreSQL connection configuration'); }
  for (const url of [runtime, direct]) {
    assert.equal(url.protocol, 'postgresql:', 'Only the local PostgreSQL setup is supported');
    assert.equal(url.hostname, '127.0.0.1', 'Remote databases are forbidden for these tests');
    assert.equal(url.port, '15432', 'Use the project Docker port, not an unrelated PostgreSQL service');
    assert.equal(url.pathname, '/auction_db', 'Unexpected development database');
  }
  assert.ok(runtime.username === direct.username, 'Runtime/direct database users must match');
  assert.ok(runtime.password === direct.password, 'Runtime/direct credentials must match');
  return { DATABASE_URL: runtime.href, DIRECT_URL: direct.href };
}

export function redact(text) {
  return text.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[database URL redacted]');
}

export function command(program, args, { timeout = 20000, env = process.env, cwd = root } = {}) {
  const result = spawnSync(program, args, { cwd, env, encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${program === process.execPath ? 'Node/Prisma' : program} failed (${result.error?.code || result.status}): ${redact(result.stderr || result.stdout || 'no output')}`);
  }
  return result.stdout;
}

export function prisma(args, databaseEnv) {
  return command(process.execPath, ['--max-old-space-size=192', 'server/node_modules/prisma/build/index.js', ...args], { env: { ...process.env, ...databaseEnv } });
}

export function verifyDockerDatabase() {
  const container = JSON.parse(command('docker', ['inspect', 'auction-postgres'], { timeout: 10000 }))[0];
  assert.equal(container.Config.Labels['com.docker.compose.project'], 'auction_app');
  assert.equal(container.State.Status, 'running');
  assert.equal(container.State.Health?.Status, 'healthy');
  assert.ok(container.Mounts.some(mount => mount.Name === 'auction_app_postgres_data' && mount.Destination === '/var/lib/postgresql/data'));
  assert.ok(container.NetworkSettings.Ports['5432/tcp'].some(port => port.HostIp === '127.0.0.1' && port.HostPort === '15432'));
}

export function testDatabaseUrl(databaseEnv, name) {
  assert.match(name, /^auction_test_[a-f0-9]{24}$/, 'Only freshly named test databases are allowed');
  const url = new URL(databaseEnv.DIRECT_URL);
  url.pathname = '/' + name;
  assertIsolatedDatabase(url.href);
  return url.href;
}

export function assertIsolatedDatabase(url) {
  const target = new URL(url);
  assert.equal(target.protocol, 'postgresql:');
  assert.equal(target.hostname, '127.0.0.1');
  assert.equal(target.port, '15432');
  assert.match(target.pathname, /^\/auction_test_[a-f0-9]{24}$/);
  return target;
}
