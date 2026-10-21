import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createHealthRouter, READINESS_TIMEOUT_MS } from '../server/dist/routes/healthRoutes.js';
import { serve } from './helpers/http.mjs';

const express = createRequire(new URL('../server/package.json', import.meta.url))('express');
async function service(t, probe, timeout = 40) {
  const app = express();
  app.use('/api', createHealthRouter(probe, timeout));
  return serve(t, app);
}
async function responseAt(base, path) {
  const response = await fetch(base + path);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-type'), /application\/json/);
  return { code: response.status, body: await response.json() };
}

test('liveness succeeds without calling a broken database', async t => {
  let calls = 0;
  const base = await service(t, async () => { calls++; throw new Error('private DB details'); });
  assert.deepEqual(await responseAt(base, '/api/health'), { code: 200, body: { status: 'ok' } });
  assert.equal(calls, 0);
});

test('readiness waits for a successful probe', async t => {
  let finish;
  const base = await service(t, () => new Promise(resolve => { finish = resolve; }), 1000);
  const request = responseAt(base, '/api/ready');
  for (let i = 0; i < 100 && !finish; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(typeof finish, 'function');
  finish([{ value: 1 }]);
  assert.deepEqual(await request, { code: 200, body: { status: 'ready', database: 'connected' } });
});

test('database rejection returns generic 503; liveness remains successful; recovery works', async t => {
  let unavailable = true;
  const base = await service(t, async () => {
    if (unavailable) throw new Error('postgresql://private:secret@internal/db');
  });
  assert.deepEqual(await responseAt(base, '/api/ready'), { code: 503, body: { status: 'unavailable' } });
  assert.equal((await responseAt(base, '/api/health')).code, 200);
  unavailable = false;
  assert.equal((await responseAt(base, '/api/ready')).code, 200);
});

test('a synchronous probe error also produces generic 503', async t => {
  const base = await service(t, () => { throw new Error('internal configuration'); });
  assert.deepEqual(await responseAt(base, '/api/ready'), { code: 503, body: { status: 'unavailable' } });
});

test('a hung probe has a bounded HTTP response and is shared until it settles', async t => {
  assert.equal(READINESS_TIMEOUT_MS, 2000);
  let calls = 0;
  let rejectProbe;
  const base = await service(t, () => {
    calls++;
    return new Promise((_resolve, reject) => { rejectProbe = reject; });
  });
  const started = performance.now();
  const responses = await Promise.all([responseAt(base, '/api/ready'), responseAt(base, '/api/ready')]);
  assert.ok(performance.now() - started >= 30, 'Exercise the timeout, not an immediate failure');
  assert.ok(performance.now() - started < 1000, 'HTTP response must not wait indefinitely');
  for (const response of responses) assert.deepEqual(response, { code: 503, body: { status: 'unavailable' } });
  assert.equal((await responseAt(base, '/api/health')).code, 200);
  assert.equal((await responseAt(base, '/api/ready')).code, 503);
  assert.equal(calls, 1, 'Do not start more DB queries after the HTTP deadline');
  rejectProbe(new Error('late DB error'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await responseAt(base, '/api/ready')).code, 503);
  assert.equal(calls, 2, 'A settled probe permits a fresh connectivity check');
  rejectProbe(new Error('cleanup'));
});
