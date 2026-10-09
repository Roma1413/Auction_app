import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export async function toggleWatchlist(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const auctionId = String(req.params.auctionId);

    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_auctionId: { userId, auctionId }
      }
    });

    if (existing) {
      await prisma.watchlist.delete({
        where: { id: existing.id }
      });
      return res.json({ watched: false, message: 'Removed from watchlist' });
    } else {
      await prisma.watchlist.create({
        data: { userId, auctionId }
      });
      return res.json({ watched: true, message: 'Added to watchlist' });
    }
  } catch (err) {
    console.error('toggleWatchlist error:', err);
    return res.status(500).json({ message: 'Error toggling watchlist' });
  }
}
