import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prisma } from '../server/dist/db.js';
import { startAuctionScheduler } from '../server/dist/services/schedulerService.js';

test('node-cron v4 keeps ten-second expiry scheduling and existing winner/error handling', async t => {
  const events = [];
  let fail = false;
  const auctions = [
    { id: 'qualifies', title: 'Qualifies', reservePrice: 100, bids: [{ bidderName: 'Buyer', amount: 150 }] },
    { id: 'below', title: 'Below reserve', reservePrice: 200, bids: [{ bidderName: 'Buyer', amount: 150 }] },
    { id: 'empty', title: 'No bids', reservePrice: null, bids: [] },
    { id: 'changed', title: 'Already changed', bids: [] },
  ];
  // Prisma delegates are proxies; replace methods directly rather than descriptor-based mocks.
  const originalFindMany = prisma.auction.findMany;
  const originalUpdateMany = prisma.auction.updateMany;
  t.after(() => {
    prisma.auction.findMany = originalFindMany;
    prisma.auction.updateMany = originalUpdateMany;
  });
  prisma.auction.findMany = async ({ where, include }) => {
    if (fail) throw new Error('Mock database unavailable');
    assert.equal(where.status, 'active');
    assert.ok(where.endTime.lte instanceof Date);
    assert.deepEqual(include.bids, { orderBy: { amount: 'desc' }, take: 1 });
    return auctions;
  };
  prisma.auction.updateMany = async ({ where, data }) => {
    assert.equal(where.status, 'active');
    assert.ok(where.endTime.lte instanceof Date);
    assert.deepEqual(data, { status: 'ended' });
    return { count: where.id === 'changed' ? 0 : 1 };
  };
  const errors = t.mock.method(console, 'error', () => {});
  const task = startAuctionScheduler({ emit: (...event) => events.push(event) });
  t.after(async () => { await task.destroy(); await prisma.$disconnect(); });
  assert.notEqual(task.getStatus(), 'stopped', 'Scheduling still starts automatically');
  const next = task.getNextRuns(3);
  assert.equal(next.length, 3);
  for (let i = 0; i < next.length; i++) {
    assert.equal(next[i].getSeconds() % 10, 0);
    if (i) assert.equal(next[i] - next[i - 1], 10000);
  }
  // Stop the wall-clock timer and exercise the callback through node-cron's real API.
  await task.stop();
  await task.execute();
  assert.equal(events.length, 3);
  assert.equal(events[0][0], 'auction-ended');
  assert.deepEqual(events[0][1].winner, { bidderName: 'Buyer', amount: 150 });
  assert.equal(events[1][1].winner, null);
  assert.equal(events[2][1].winner, null);
  fail = true;
  await task.execute();
  assert.equal(events.length, 3, 'DB failure must not emit fake auction outcomes');
  assert.equal(errors.mock.callCount(), 1, 'Existing scheduler error handling remains active');
});
