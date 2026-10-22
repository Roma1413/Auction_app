import cron from 'node-cron';
import { Server } from 'socket.io';
import { prisma } from '../db.js';

export function startAuctionScheduler(io: Server) {
  console.log('⏰ Starting background auction status scheduler...');

  // Check every 10 seconds for ended auctions
  return cron.schedule('*/10 * * * * *', async () => {
    try {
      const now = new Date();

      const endedAuctions = await prisma.auction.findMany({
        where: {
          status: 'active',
          endTime: { lte: now }
        },
        include: {
          bids: {
            orderBy: { amount: 'desc' },
            take: 1
          }
        }
      });

      for (const auc of endedAuctions) {
        const highestBid = auc.bids[0];
        const winningBid = highestBid && (!auc.reservePrice || highestBid.amount >= auc.reservePrice) ? highestBid : null;

        const changed = await prisma.auction.updateMany({
          where: { id: auc.id, status: 'active', endTime: { lte: now } },
          data: { status: 'ended' }
        });
        if (changed.count !== 1) continue;

        console.log(`🏁 Auction ended: "${auc.title}" (Winner: ${winningBid ? winningBid.bidderName : 'None'})`);

        // Emit Socket.io notification to auction room
        io.emit('auction-ended', {
          auctionId: auc.id,
          winner: winningBid ? { bidderName: winningBid.bidderName, amount: winningBid.amount } : null,
          title: auc.title
        });
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });
}
