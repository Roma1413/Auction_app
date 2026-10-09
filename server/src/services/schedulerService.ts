import cron from 'node-cron';
import { Server } from 'socket.io';
import { prisma } from '../db.js';

export function startAuctionScheduler(io: Server) {
  console.log('⏰ Starting background auction status scheduler...');

  // Check every 10 seconds for ended auctions
  cron.schedule('*/10 * * * * *', async () => {
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
        const winningBid = auc.bids[0];
        const newStatus = winningBid ? 'ended' : 'ended';

        await prisma.auction.update({
          where: { id: auc.id },
          data: { status: newStatus }
        });

        console.log(`🏁 Auction ended: "${auc.title}" (Winner: ${winningBid ? winningBid.bidderName : 'None'})`);

        // Emit Socket.io notification to auction room
        io.to(`auction:${auc.id}`).emit('auction-ended', {
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
