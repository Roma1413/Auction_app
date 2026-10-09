import { prisma } from './db.js';
const rollback = new Error('ROLLBACK_TEST');
try {
  await prisma.$transaction(async tx => {
    const seller = await tx.user.create({ data: { email: `relation-check-${Date.now()}@example.invalid`, password: 'test-only', name: 'Relation check' } });
    const auction = await tx.auction.create({ data: { title: 'Relation check', description: 'Temporary rollback test', category: 'Electronics', condition: 'Brand New', images: '[]', startingPrice: 10, currentBid: 20, endTime: new Date(Date.now() + 3600000), sellerId: seller.id } });
    await tx.bid.create({ data: { auctionId: auction.id, bidderId: seller.id, bidderName: seller.name, amount: 20 } });
    await tx.watchlist.create({ data: { userId: seller.id, auctionId: auction.id } });
    const linked = await tx.user.findUniqueOrThrow({ where: { id: seller.id }, include: { auctions: { include: { bids: true, watchlistedBy: true } }, bids: true, watchlist: true } });
    if (linked.auctions.length !== 1 || linked.bids.length !== 1 || linked.watchlist.length !== 1 || linked.auctions[0].bids.length !== 1 || linked.auctions[0].watchlistedBy.length !== 1) throw new Error('Relation check failed');
    console.log('User → Auction → Bid and Watchlist relationships passed.');
    throw rollback;
  });
} catch (error) { if (error !== rollback) { console.error('Relationship check failed'); process.exitCode = 1; } else console.log('Test records rolled back.'); }
finally { await prisma.$disconnect(); }
