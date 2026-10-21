import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const port = 4187;
const base = `http://localhost:${port}`;
const child = spawn(process.execPath, ['server/dist/index.js'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: String(port), JWT_SECRET: randomBytes(32).toString('hex') },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let started = false;
child.stdout.on('data', data => { if (data.toString().includes('Backend Server running')) started = true; });
// Keep child output private: failure messages never reveal connection credentials.
child.stderr.on('data', () => {});
try {
  for (let attempt = 0; attempt < 100 && !started && child.exitCode === null; attempt++) await delay(100);
  assert.ok(started, 'Production server must start on the test port');
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' });
  const ready = await fetch(`${base}/api/ready`);
  assert.equal(ready.status, 503, 'The test database is deliberately unavailable');
  assert.deepEqual(await ready.json(), { status: 'unavailable' });
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /manifest.webmanifest/);
  assert.equal(page.headers.get('cache-control'), 'no-cache');
  assert.equal(page.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
  const manifest = await fetch(`${base}/manifest.webmanifest`);
  assert.match(manifest.headers.get('content-type'), /application\/manifest\+json/);
  assert.equal((await manifest.json()).display, 'standalone');
  const worker = await fetch(`${base}/sw.js`);
  assert.equal(worker.status, 200);
  assert.equal(worker.headers.get('cache-control'), 'no-cache');
  assert.match(worker.headers.get('content-type'), /javascript/);
  assert.equal((await fetch(`${base}/icons/icon-192.png`)).status, 200);
  assert.equal((await fetch(`${base}/offline.html`)).status, 200);
  assert.equal((await fetch(`${base}/api/not-a-route`)).status, 404);
  const malformed = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(malformed.status, 400);
  assert.match(malformed.headers.get('content-type'), /application\/json/);
  assert.match((await malformed.json()).message, /Invalid request body/);
  const sellerRoute = await fetch(`${base}/api/auctions/test-probe/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept-highest' }) });
  assert.equal(sellerRoute.status, 401);
  assert.match(sellerRoute.headers.get('content-type'), /application\/json/);
  const photoRequest = await fetch(`${base}/api/auctions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: ['data:image/jpeg;base64,' + 'A'.repeat(300000)] }) });
  assert.equal(photoRequest.status, 401, 'A compressed photo reaches authentication without exceeding the body limit');
  const oversizedPhoto = await fetch(`${base}/api/auctions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: ['A'.repeat(1100000)] }) });
  assert.equal(oversizedPhoto.status, 413);
  assert.match((await oversizedPhoto.json()).message, /smaller photo/);
  assert.equal((await fetch(`${base}/missing.png`)).status, 404);
  const invalidGoogle = await fetch(`${base}/api/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({credential:'invalid-test-token'}) });
  assert.equal(invalidGoogle.status, 401);
  console.log('Production checks passed: frontend, manifest, icons, service worker headers, offline page, API routing, and invalid Google token rejection.');
} finally {
  child.kill();
}
