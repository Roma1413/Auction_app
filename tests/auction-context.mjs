import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { act, createElement, StrictMode, useLayoutEffect } from 'react';
import { JSDOM } from 'jsdom';

const { Server } = createRequire(new URL('../server/package.json', import.meta.url))('socket.io');

test('auction context preserves history, live details, reconnect rooms, and Strict Mode cleanup', async t => {
  let listings = Array.from({ length: 7 }, (_, index) => ({
    id: `item-${index}`, title: `Listing ${index}`, currentBid: 100,
    bidCount: 0, bids: [], status: 'active', images: [],
  }));
  let failListings = false;
  const server = createServer((req, res) => {
    assert.equal(req.method, 'GET', 'This fixture must never mutate a real service');
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/auctions') {
      res.statusCode = failListings ? 503 : 200;
      res.end(JSON.stringify(failListings ? { message: 'Unavailable' } : listings));
    } else if (req.url === '/api/health') res.end('{"status":"ok"}');
    else { res.statusCode = 404; res.end('{}'); }
  });
  const io = new Server(server);
  const sockets = new Map();
  const joins = [];
  io.on('connection', socket => {
    sockets.set(socket.id, socket);
    socket.on('disconnect', () => sockets.delete(socket.id));
    socket.on('join-auction', id => { joins.push(id); socket.join(id); });
    socket.on('leave-auction', id => socket.leave(id));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const dom = new JSDOM('<div id="root"></div>', { url: base });
  // Include malformed entries to preserve filtering of persisted history.
  dom.window.localStorage.setItem('auction-recent', '["item-0",null,42]');
  const originalFetch = globalThis.fetch;
  const globals = {
    window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: (url, options) => originalFetch(new URL(url, base), options),
  };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  let root;
  t.after(async () => {
    if (root) await act(async () => root.unmount());
    await new Promise(resolve => io.close(resolve));
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  const { createRoot } = await import('react-dom/client');
  const { AuctionProvider } = await import('../src/context/AuctionContext.tsx');
  const { useAuction } = await import('../src/context/useAuction.ts');
  let current;
  function Consumer() {
    const context = useAuction();
    useLayoutEffect(() => { current = context; });
    return createElement('span', null, context.selectedItem?.currentBid || 'No selection');
  }
  async function until(predicate) {
    for (let i = 0; i < 200 && !predicate(); i++) await act(async () => { await delay(20); });
    assert.ok(predicate(), 'Expected React/socket state within four seconds');
  }
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(createElement(StrictMode, null,
    createElement(AuctionProvider, null, createElement(Consumer)))));
  await until(() => current.auctions.length === 7 && current.isBackendConnected && sockets.size === 1);
  assert.deepEqual(current.recentItemIds, ['item-0']);
  for (const item of listings) await act(async () => current.setSelectedItem(item));
  assert.deepEqual(current.recentItemIds, ['item-6', 'item-5', 'item-4', 'item-3', 'item-2', 'item-1']);
  await act(async () => current.setSelectedItem(listings[2]));
  assert.deepEqual(current.recentItemIds, ['item-2', 'item-6', 'item-5', 'item-4', 'item-3', 'item-1']);
  assert.deepEqual(JSON.parse(localStorage.getItem('auction-recent')), current.recentItemIds);
  await until(() => [...sockets.values()][0]?.rooms.has('item-2'));
  assert.equal([...sockets.values()][0].rooms.has('item-6'), false);
  const joinsBeforeUpdate = joins.length;
  const bid = { id: 'bid-1', bidderId: 'buyer', amount: 150 };
  await act(async () => {
    io.emit('bid-updated', { auctionId: 'item-2', currentBid: 150, bidCount: 1, newBid: bid });
    await delay(50);
  });
  await until(() => current.selectedItem.currentBid === 150);
  assert.equal(document.querySelector('span').textContent, '150');
  assert.equal(current.selectedItem.bids.length, 1, 'Strict Mode must not duplicate socket handlers');
  assert.equal(joins.length, joinsBeforeUpdate, 'Price updates must not churn room subscriptions');
  assert.equal(current.recentItemIds[0], 'item-2');

  // Force a transport loss: the client must reconnect and rejoin the selected room.
  await act(async () => {
    [...sockets.values()][0].conn.close();
    await delay(20);
  });
  await until(() => sockets.size === 1 && [...sockets.values()][0].rooms.has('item-2') && joins.length > joinsBeforeUpdate);
  listings = listings.map(item => item.id === 'item-2' ? { ...item, status: 'sold', currentBid: 200 } : item);
  await act(async () => current.refreshAuctions());
  assert.equal(current.selectedItem.status, 'sold');
  assert.equal(current.selectedItem.currentBid, 200);
  await act(async () => current.clearRecentHistory());
  assert.deepEqual(current.recentItemIds, []);
  assert.equal(localStorage.getItem('auction-recent'), null);
  await act(async () => current.setSelectedItem(null));
  assert.equal(current.selectedItem, null);
  await act(async () => current.setSelectedItem(listings[2]));
  assert.deepEqual(current.recentItemIds, ['item-2']);
  failListings = true;
  await act(async () => current.refreshAuctions());
  assert.match(current.loadError, /Could not load listings/);
  assert.equal(current.isLoading, false);
  assert.equal(current.selectedItem.currentBid, 200, 'A failed refresh retains the current listing');
  failListings = false;
  await act(async () => current.refreshAuctions());
  assert.equal(current.loadError, '');
  await act(async () => root.unmount());
  root = undefined;
  await until(() => sockets.size === 0);
});
