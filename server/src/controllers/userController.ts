import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export async function getNotifications(req: AuthRequest, res: Response) {
  if (!req.user?.userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const notifications = await prisma.notification.findMany({ where: { userId: req.user.userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return res.json({ notifications: notifications.map(n => ({ id: n.id, message: n.message, timestamp: n.createdAt.toISOString() })) });
  } catch { return res.status(500).json({ message: 'Could not load notifications' }); }
}

export async function clearNotifications(req: AuthRequest, res: Response) {
  if (!req.user?.userId) return res.status(401).json({ message: 'Unauthorized' });
  const ids = req.body.ids;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string')) return res.status(400).json({ message: 'Invalid notification IDs' });
  try {
    await prisma.notification.deleteMany({ where: { userId: req.user.userId, id: { in: ids } } });
    return res.json({ success: true });
  } catch { return res.status(500).json({ message: 'Could not clear notifications' }); }
}

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
