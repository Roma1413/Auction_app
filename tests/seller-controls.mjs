import assert from 'node:assert/strict';
import { prisma } from '../server/dist/db.js';
import { closeAuction } from '../server/dist/controllers/auctionController.js';

const originalTransaction = prisma.$transaction;
const base = () => ({
  id: 'test-auction', sellerId: 'seller', status: 'active', title: 'Test listing',
  currentBid: 200, bidCount: 2, endTime: new Date(Date.now() + 3600000),
  reservePrice: 500, images: '[]', specs: null,
  seller: { id: 'seller', name: 'Seller', createdAt: new Date() },
  bids: [
    { id: 'high', bidderId: 'buyer', bidderName: 'Buyer', amount: 200 },
    { id: 'low', bidderId: 'other', bidderName: 'Other', amount: 100 }
  ],
});
async function invoke(auction, userId, body, race = false) {
  let state = structuredClone(auction);
  let notices = [];
  const events = [];
  prisma.$transaction = async callback => {
    const draft = structuredClone(state);
    const pending = [];
    const result = await callback({
      auction: {
        findUnique: async () => structuredClone(draft),
        updateMany: async ({ where, data }) => {
          assert.equal(where.sellerId, 'seller');
          assert.equal(where.status, 'active');
          assert.equal(where.currentBid, auction.currentBid);
          assert.equal(where.bidCount, auction.bidCount);
          assert.ok(where.endTime.gt instanceof Date);
          if (race) return { count: 0 };
          Object.assign(draft, data);
          return { count: 1 };
        },
        findUniqueOrThrow: async () => draft,
      },
      notification: { createMany: async ({ data }) => { pending.push(...data); } },
    });
    state = draft; notices = pending;
    return result;
  };
  const req = { user: userId ? { userId } : undefined, params: { id: auction.id }, body, app: { get: () => ({ emit: (...event) => events.push(event) }) } };
  const response = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await closeAuction(req, response);
  return { response, state, notices, events };
}
try {
  for (const [user, action, status] of [[null, 'cancel', 401], ['other', 'cancel', 400]]) {
    const result = await invoke(base(), user, { action });
    assert.equal(result.response.code, status);
    assert.equal(result.state.status, 'active');
    assert.equal(result.events.length, 0);
  }
  const empty = { ...base(), bids: [], bidCount: 0, currentBid: 50 };
  const cancelledEmpty = await invoke(empty, 'seller', { action: 'cancel' });
  assert.equal(cancelledEmpty.state.status, 'cancelled');
  assert.equal(cancelledEmpty.state.winnerId, null);
  assert.equal(cancelledEmpty.notices.length, 0);

  for (const body of [{ action: 'cancel' }, { action: 'cancel', reason: 'short' }, { action: 'cancel', reason: 'x'.repeat(501) }, { action: 'accept-highest', expectedBidId: 'low' }, { action: 'invalid' }]) {
    const rejected = await invoke(base(), 'seller', body);
    assert.equal(rejected.response.code, 400);
    assert.equal(rejected.state.status, 'active');
  }
  const cancelled = await invoke(base(), 'seller', { action: 'cancel', reason: 'The item was damaged during storage.' });
  assert.equal(cancelled.state.status, 'cancelled');
  assert.equal(cancelled.state.winnerId, null);
  assert.equal(cancelled.notices.length, 2);
  assert.ok(cancelled.notices.every(n => n.message.includes('damaged')));
  assert.equal(cancelled.events[0][1].winner, null);
  const accepted = await invoke(base(), 'seller', { action: 'accept-highest', expectedBidId: 'high' });
  assert.equal(accepted.state.status, 'sold');
  assert.equal(accepted.state.winnerId, 'buyer');
  assert.equal(accepted.state.currentBid, 200);
  assert.equal(accepted.state.closureType, 'accepted-highest');
  assert.equal(accepted.notices.length, 2);
  assert.equal(accepted.events[0][1].winner.bidderId, 'buyer');
  const raced = await invoke(base(), 'seller', { action: 'accept-highest', expectedBidId: 'high' }, true);
  assert.equal(raced.response.code, 400);
  assert.equal(raced.state.status, 'active');
  assert.equal(raced.notices.length, 0);
  assert.equal(raced.events.length, 0);
  for (const auction of [{ ...base(), endTime: new Date(0) }, accepted.state, cancelled.state]) {
    assert.equal((await invoke(auction, 'seller', { action: 'cancel' })).response.code, 400);
  }
  const repeatedBidder = base(); repeatedBidder.bids[1].bidderId = 'buyer';
  assert.equal((await invoke(repeatedBidder, 'seller', { action: 'accept-highest', expectedBidId: 'high' })).notices.length, 1);
  console.log('Seller checks passed: authorization, no-bid cancellation, required reasons, highest buyer, reserve override, stale confirmation, concurrency guard, duplicate/expired closure, and saved bidder notices.');
} finally { prisma.$transaction = originalTransaction; await prisma.$disconnect(); }
