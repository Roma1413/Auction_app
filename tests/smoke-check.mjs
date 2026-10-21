import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { smokeCheck } from '../scripts/smoke-check.mjs';
import { serve } from './helpers/http.mjs';

const script = fileURLToPath(new URL('../scripts/smoke-check.mjs', import.meta.url));
function cli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { windowsHide: true });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, output }));
  });
}
function healthy(path) {
  return path === '/api/health' ? { status: 'ok' } : { status: 'ready', database: 'connected' };
}

test('CLI success checks only the two read-only GET endpoints', async t => {
  const requests = [];
  const base = await serve(t, (req, res) => {
    requests.push([req.method, req.url]);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(healthy(req.url)));
  });
  const result = await cli([base]);
  assert.equal(result.code, 0);
  assert.match(result.output, /Smoke check passed/);
  assert.deepEqual(requests, [['GET', '/api/health'], ['GET', '/api/ready']]);
});

test('CLI exits non-zero on database unavailability without leaking response details', async t => {
  const base = await serve(t, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = req.url === '/api/ready' ? 503 : 200;
    res.end(JSON.stringify(req.url === '/api/ready' ? { error: 'private-db-error' } : healthy(req.url)));
  });
  const result = await cli([base]);
  assert.equal(result.code, 1);
  assert.doesNotMatch(result.output, /private-db-error/);
});

test('invalid HTTP, content type, JSON, and health contracts fail', async t => {
  const invalid = [
    { name: 'HTML success', type: 'text/html', body: '<html>gateway</html>' },
    { name: 'malformed JSON', type: 'application/json', body: '{broken' },
    { name: 'missing status', type: 'application/json', body: '{}' },
    { name: 'null body', type: 'application/json', body: 'null' },
    { name: 'wrong status', type: 'application/json', body: '{"status":"unavailable"}' },
    { name: 'missing database', type: 'application/json', body: '{"status":"ready"}', path: '/api/ready' },
    { name: 'HTTP 500', type: 'application/json', body: '{"status":"ok"}', code: 500 },
    { name: 'HTTP 201', type: 'application/json', body: '{"status":"ok"}', code: 201 },
    { name: 'redirect', type: 'application/json', body: '{}', code: 302 },
  ];
  for (const item of invalid) await t.test(item.name, async t => {
    const base = await serve(t, (req, res) => {
      const failing = req.url === (item.path || '/api/health');
      res.statusCode = failing ? item.code || 200 : 200;
      res.setHeader('Content-Type', failing ? item.type : 'application/json');
      if (item.code === 302) res.setHeader('Location', '/api/health');
      res.end(failing ? item.body : JSON.stringify(healthy(req.url)));
    });
    await assert.rejects(smokeCheck(base), /failed: expected healthy JSON/);
  });
});

test('timeouts bound both response headers and response body reads', async t => {
  for (const phase of ['headers', 'body']) await t.test(phase, async t => {
    const base = await serve(t, (_req, res) => {
      if (phase === 'body') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write('{');
      }
    });
    const started = performance.now();
    await assert.rejects(smokeCheck(base, { timeoutMs: 40 }), /within 40 ms/);
    assert.ok(performance.now() - started >= 30, 'Must reach the deadline, not fail immediately');
    assert.ok(performance.now() - started < 1000);
  });
});

test('CLI exits non-zero after its default network timeout', async t => {
  const base = await serve(t, () => {});
  const started = performance.now();
  assert.equal((await cli([base])).code, 1);
  assert.ok(performance.now() - started >= 2900, 'Must exercise the default three-second timeout');
  assert.ok(performance.now() - started < 6000);
});

test('network connection failure is rejected', async t => {
  // Close our ephemeral server before connecting, avoiding assumptions about a fixed port.
  let closedBase;
  await t.test('closed listener', async t => { closedBase = await serve(t, (_req, res) => res.end()); });
  await assert.rejects(smokeCheck(closedBase), /failed: expected healthy JSON/);
});

test('CLI rejects missing, extra, invalid, or credential-bearing URLs', async () => {
  for (const args of [[], ['http://localhost', 'extra'], ['not-a-url'], ['ftp://localhost'],
    ['https://private:secret@example.com'], ['https://example.com/path'], ['https://example.com/?token=secret']]) {
    const result = await cli(args);
    assert.equal(result.code, 1);
    assert.doesNotMatch(result.output, /private|secret|token=/);
  }
});
