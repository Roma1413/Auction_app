import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.scope, '/');
for (const icon of manifest.icons) {
  const png = await readFile(new URL(`../dist${icon.src}`, import.meta.url));
  const [width, height] = icon.sizes.split('x').map(Number);
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
}

const listeners = new Map();
const stores = new Map();
const cache = {
  addAll: async urls => { for (const url of urls) stores.set(url, new Response('offline screen')); },
  match: async request => stores.get(typeof request === 'string' ? request : request.url),
  put: async (request, response) => stores.set(request.url, response),
};
const origin = 'https://auction.example';
let online = true;
let networkCalls = 0;
const context = vm.createContext({
  URL, Response,
  self: { location: { origin }, clients: { claim: async () => {} }, addEventListener: (name, callback) => listeners.set(name, callback) },
  caches: { open: async () => cache, match: cache.match, keys: async () => [], delete: async () => true },
  fetch: async () => { networkCalls++; if (!online) throw new Error('offline'); return { ok: true, type: 'basic', clone: () => new Response('asset') }; },
});
vm.runInContext(await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8'), context);
let pending;
listeners.get('install')({ waitUntil: promise => { pending = promise; } });
await pending;
assert.ok(stores.has('/offline.html'));
listeners.get('activate')({ waitUntil: promise => { pending = promise; } });
await pending;

function fetchEvent(path, options = {}) {
  let intercepted = false;
  let response;
  listeners.get('fetch')({
    request: { method: 'GET', mode: 'cors', url: new URL(path, origin).href, ...options },
    respondWith: value => { intercepted = true; response = value; },
  });
  return { intercepted, response };
}
for (const path of ['/api/auth/me', '/api/auctions', '/socket.io/?transport=polling', 'https://accounts.google.com/gsi/client']) {
  assert.equal(fetchEvent(path).intercepted, false, `${path} must stay on the network`);
}
assert.equal(fetchEvent('/api/auth/google', { method: 'POST' }).intercepted, false);
await fetchEvent('/assets/app-hash.js').response;
const callsAfterFirstAsset = networkCalls;
await fetchEvent('/assets/app-hash.js').response;
assert.equal(networkCalls, callsAfterFirstAsset, 'Public build assets use the cache');
assert.equal(fetchEvent('/index.html').intercepted, false, 'HTML is not cached as a static asset');
online = false;
const offline = await fetchEvent('/', { mode: 'navigate' }).response;
assert.equal(await offline.text(), 'offline screen');
assert.equal(fetchEvent('/api/auctions').intercepted, false, 'Offline API requests must not use stale auction data');
console.log('PWA checks passed: icon sizes, installation metadata, offline navigation, static cache, and sensitive request exclusions.');
